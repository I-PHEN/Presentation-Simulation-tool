# Slice 2 — Robust Intake, Cleaner Structure, Deckless Topic Mode (Design)

**Status:** Approved (2026-07-25).
**PRD:** `docs/superpowers/specs/2026-07-21-sparring-partner-product-prd.md` (§2 daily/topic vision, §5.1 topic-prompt source, §11 deckless practice).
**Branch:** new `slice-2-topic-mode` off `main` (Slice 1 is merged).

Builds directly on the Slice-1 engine/report/longitudinal work. Reuses the grounded, anti-fabrication coaching pipeline; nothing here rebuilds the AI endpoints or the simulator core.

---

## 1. Goal

Three connected improvements, shipped in order:
- **A. Unblock deck upload** (currently broken) and clean the dev data.
- **B. One clear entry point** — Rehearse offers Deck *or* Topic; Home stops duplicating "Import deck."
- **C. Deckless topic mode + onboarding** — capture interests at first run, recommend tailored speaking topics, and run a slide-free rehearsal (spoken Q&A with the AI panel) that flows into the *same* grounded coaching report and longitudinal profile.

## 2. Root cause of the upload bug (verified)

The upload pipeline (`src/app/api/upload-presentation/route.ts`) shells out to **`python`** for text extraction (`pdfplumber`) and slide rendering (`pypdfium2` + `Pillow`), and to **PowerPoint COM** (or LibreOffice) for PPTX→PDF. On this machine the libs exist under `C:\Python313`, but three `python` executables are on PATH (`C:\Python313`, a `Python312`, and the Microsoft Store stub). The Next.js server resolves a **different** `python` than the shell — one without the libs — so both Python steps fail, the route swallows the error, and returns the misleading "No pages could be rendered." Confirmed against the real failing file in the server log.

## 3. Binding decisions

- **Onboarding:** a one-time **first-run interests screen** after first sign-in (covers Google signup *and* Guest Mode), preset chips + "add your own," skippable, editable later.
- **Topics:** **LLM-tailored from interests** (one cheap call) shown as a refreshable pick-list, **plus type-your-own**. Home surfaces one recommended topic.
- **Deckless report reuses Slice 1:** grounded metrics that don't apply to a slide-free talk **omit automatically**; the report's LLM evaluation gets a **topic-aware branch** (reasoning/evidence findings validated against transcript quotes — same anti-fabrication rule, no slide-reliance).
- **Honesty preserved:** topic sessions never display deck-only signals; a user who skips onboarding just gets "type your own topic" until they add interests.
- **Portability tie-breaker:** the deckless path needs no Python/Office at all — it is the robust, deployable core. The full Node-native rewrite of the *deck* pipeline stays deferred (§11).

---

## Part A — Unblock upload + clean data

### A1. Robust Python resolution — `src/features/defense/python-runtime.ts` (pure-ish, tested seam)
`resolvePythonInterpreter(deps): Promise<string>` — memoized. Probes candidates in order: `process.env.PYTHON_PATH`, `py -3` (Windows launcher), `python3`, `python`, and common absolute install paths; for each, runs a tiny verify (`-c "import pypdfium2, pdfplumber"`) and returns the first that succeeds. Throws a clear "no usable Python (need pypdfium2 + pdfplumber)" error if none work. The command-probing is injected so the selection/ordering logic is unit-testable against fakes; the actual `execFile` adapter is thin/untested.
- `upload-presentation/route.ts` uses the resolved interpreter for both `processPDF` subprocesses instead of bare `python`.
- **Immediate unblock:** set `PYTHON_PATH=C:\Python313\python.exe` in `.env` (documented; the resolver makes this a convenience, not a requirement).

### A2. Honest upload errors
When text extraction or rendering fails, capture the subprocess `stderr` and return an **actionable** message (e.g. "Slide rendering failed: <stderr tail>") rather than the blanket "No pages could be rendered." Keep the 30-slide and file-type guards. This turns silent misconfig into a visible, fixable error.

### A3. Data reset — `scripts/reset-data.mjs` + `npm run db:reset-data`
Deletes all `Score`, `Message`, `Session`, `SpeakerProfile` rows (order respects FKs) and removes generated assets (`slides/`, `public/recordings/`). Leaves the schema, migrations, and the guest-auth mechanism intact. Idempotent; prints a summary. Run once now to clear the seeded demo + test data.

---

## Part B — One entry point (IA cleanup)

### B1. Rehearse gains a source step
`/decks/new` (the "Rehearse" nav target) gains **Step 0: What are you rehearsing against? — Deck or Topic.**
- **Deck** → the existing `RehearseSetup` (upload + config), unchanged.
- **Topic** → the new `TopicSetup` (§C3).
- Implemented as a small `RehearseSourcePicker` that swaps the body; the page owns which source is active. Deck path keeps all its current behavior and tests.

### B2. Home stops duplicating intake
`StudioDesk` (Home) currently shows an "Import deck" CTA (deck-intake affordance). Replace it: Home's primary CTA becomes **"Start rehearsing" → `/decks/new`** (Rehearse), and Home adds a **"Today's topic"** card (§C4) when the user has interests. The next-focus card (Slice 1) stays. No deck upload lives on Home anymore. `buildTodayModel`/StudioDesk copy locks updated where the CTA text changes (this component's own tests).

---

## Part C — Deckless topic mode + onboarding

### C1. Schema (additive)
- `User.interests String @default("[]")` (JSON array of interest labels), `User.onboardedAt DateTime?`.
- `Session.source String @default("deck")` (`"deck"` | `"topic"`) and `Session.topic String?`. Deck sessions unchanged (`source="deck"`); topic sessions set `source="topic"`, `topic=<text>`, and an empty `deckContext`.
- Migrations additive; existing rows default to `deck`/empty. Schema-lock test extended.

### C2. Onboarding interests
- **Route/screen `/welcome`** — first-run only: `InterestsPicker` (preset chips from a curated `INTEREST_OPTIONS` list + free-text add), Skip and Continue. On Continue, `PUT /api/me` saves interests + stamps `onboardedAt`; routes to Home. Skip stamps `onboardedAt` with empty interests.
- **First-run guard:** a small client check (in the shell or a provider) — signed-in user with `onboardedAt == null` → redirect to `/welcome`. Guests included.
- **`GET/PUT /api/me`** — auth-guarded; returns/updates `{ interests, onboardedAt }` on the caller's `User` (distinct from `SpeakerProfile`). Editable later via a minimal settings affordance in the account menu (thin; full settings page deferred).
- Pure `InterestsPicker` model (selected set + add/remove/normalize) unit-tested; the screen renders it.

### C3. Topic recommendation — `POST /api/topics` + `TopicSetup`
- **`buildTopicsPrompt(interests)` + `parseTopicsResponse(raw)`** — pure, tested. The prompt asks for N (≈4) specific, defensible, *speakable* topics grounded in the user's interests; the parser validates/limits the returned list.
- **`POST /api/topics`** — auth-guarded; loads the caller's interests (falls back to a general set when none), one LLM call via the existing `getZAI`, returns `{ topics: string[] }`. Non-fatal: on failure returns a small default set so the UI still works.
- **`TopicSetup`** (Rehearse Topic source): shows the recommended topics as selectable cards, a **refresh** action (re-calls `/api/topics`), a **type-your-own** field, then the same mode/stance step as deck. "Start rehearsal" → creates a topic session (§C5).

### C4. Home "Today's topic"
When the user has interests, Home shows one recommended topic (first from `/api/topics`, or cached) with a "Rehearse this" CTA → Rehearse Topic setup prefilled. When no interests, the card invites them to pick interests (links to `/welcome`/settings). Purely additive to Home.

### C5. Deckless session + room
- **Session creation:** `/api/session` gains a **topic branch** (`body.mode && body.topic`) → creates `source="topic"`, `practiceMode="topic"`, `topic`, `title`, `mode`, `stance`, empty `deckContext`.
- **Engine reuse via a synthetic single card:** to keep the Slice-1 simulator engine intact, a topic session is modeled to the room as a **one-card "deck"** whose card text = the topic (+ a few angles). The room swaps `SlideStage` → **`TopicStage`** (renders the topic card, not a slide image) based on `session.source`; slide navigation is hidden (one card); everything else in the voice/turn/metrics loop is unchanged.
- **`TopicStage.tsx`** — presentational, soft-depth, renders the topic + angle prompts as the immersive hero. `renderToStaticMarkup`-tested.
- **`/rehearse/[sessionId]` + `parseSession`** learn the `source` discriminator: `deck` → SlideStage as today; `topic` → TopicStage + synthetic card.

### C6. Deckless coaching report (topic-aware)
- **Metrics:** reuse `computeCoachingMetrics` in a **deckless-aware** way. IMPORTANT honesty point: a topic session is modeled as a one-card deck, so it *does* have speaking time on that card — meaning `ownWords` would NOT auto-omit from empty `slideTimes` and would falsely compute ~100. So the topic path must **explicitly omit `ownWords`/`verbatimSlides`** (a `deckless` flag through `computeCoachingMetrics`/`dimensionsFromMetrics`, not reliance on empty inputs). pace/fillers/questionHandling flow through unchanged, keeping the longitudinal profile coherent. The MetricsStrip "longest slide" chip is relabeled/hidden for topic mode (there are no slides).
- **Findings:** the report route's evaluation gets a **topic branch** — a `buildTopicEvaluationPrompt(topic, transcript, examinerEvents)` that asks for reasoning/evidence findings (clarity of argument, unsupported claims, dodged questions) with `presenterQuote` validated against the **transcript** (the existing anti-fabrication check works unchanged — quotes come from what you said, not slides). No slide-reliance basis for topic mode.
- **Everything else reuses Slice 1:** timeline, persona verdicts, drills, audio recording/replay, tap-to-seek, the minimal-report fallback, and the `recordSessionOutcome` longitudinal diff — all source-agnostic. A topic session appears in Progress history and moves the same dimensions it legitimately measures.

---

## 4. Architecture / unit boundaries

New pure/tested units: `python-runtime.ts` (resolver), `InterestsPicker` model, `buildTopicsPrompt`/`parseTopicsResponse`, `buildTopicEvaluationPrompt`, topic-session payload builder. New routes: `GET/PUT /api/me`, `POST /api/topics`, topic branches on `/api/session` and `/api/defense/report`. New UI: `/welcome` + `InterestsPicker`, `RehearseSourcePicker`, `TopicSetup`, `TopicStage`, Home "Today's topic" card. Thin/untested adapters: the Python `execFile` glue, the reset-data script (verified by running it). Everything else is reuse.

## 5. Data flow (topic mode)
```
first sign-in → /welcome → PUT /api/me (interests) → Home
Home/Rehearse → POST /api/topics (interests → LLM topics) → pick/type a topic
→ POST /api/session {mode, stance, topic} → source="topic" session
→ /rehearse/[id] (TopicStage + synthetic card) → immersive spoken Q&A (panel probes topic)
→ End → POST /api/defense/report (topic branch: transcript-validated findings + deck-agnostic metrics)
→ recordSessionOutcome → Home next-focus + Progress growth (same as deck sessions)
```

## 6. Error handling
- Upload: resolver throws a clear message if no usable Python; route surfaces real stderr; retryable vs terminal preserved.
- `/api/topics`: LLM failure → default topic set (non-fatal), UI still usable.
- Onboarding: skip is always available; a user with no interests still reaches a working Topic setup (type-your-own).
- Topic report: same graceful minimal-report fallback as Slice 1 when findings can't validate.

## 7. Testing
- **Pure units:** python-resolver selection (picks first import-capable candidate; throws when none), InterestsPicker model, topics prompt/parse, topic-eval prompt shape, topic-session payload builder, topic-mode metric omission (no verbatim/ownWords).
- **Component (`renderToStaticMarkup`):** InterestsPicker/welcome, RehearseSourcePicker, TopicSetup (topics list + refresh + type-your-own), TopicStage, Home today's-topic card.
- **Route (vi.mock):** `/api/me` GET/PUT, `/api/topics` (interests→topics + default fallback), `/api/session` topic branch, `/api/defense/report` topic branch (transcript-validated findings, deck-only signals absent).
- **Live (in-browser):** run `db:reset-data`; verify a real PDF/PPTX now uploads (Python resolver); first-run `/welcome` → interests → Home today's topic; Rehearse → Topic → deckless room → speak → report shows grounded metrics + reasoning findings + persona verdicts + audio replay; the topic session lands in Progress.
- The Slice-1 suite stays green; deck-path tests unchanged.

## 8. Sequencing (each independently shippable)
1. **A** — python-runtime + honest errors + `db:reset-data` (unblocks you immediately; run the reset).
2. **B** — Rehearse source step + Home CTA cleanup.
3. **C** — schema → `/api/me` + onboarding → `/api/topics` + TopicSetup + Home topic card → topic session + TopicStage room → topic-aware report.

## 9. Out of scope (later)
- Node-native deck pipeline (drop Python/Office) — the portability rewrite.
- Full settings page; interests editing beyond a minimal affordance.
- Streaks/daily-challenge loop; job-interview persona pack (separate slices).
- Screen-share and video (still excluded).
