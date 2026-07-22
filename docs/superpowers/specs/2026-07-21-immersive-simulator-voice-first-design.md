# Immersive Simulator (Voice-First, Multi-Persona) — Design

**Status:** Approved design (2026-07-21). Covers Slice-1 Phases **4 (headless engine)** and **5 (immersive UI + route)** of the Sparring Partner PRD (`docs/superpowers/specs/2026-07-21-sparring-partner-product-prd.md`). Branch: `simulator-coaching`.

---

## 1. Goal

Replace the orphaned 1,597-line `present-section` monolith with a modular, immersive, **voice-first multi-persona** rehearsal room at `/rehearse/[sessionId]`. The room puts the presenter on a full-viewport stage in front of a small AI **panel** (2–3 distinct personas) that listens, then challenges them with **evidence-grounded** questions spoken aloud in distinct voices — while a live transcript and pacing/filler metrics run alongside.

This is **Approach 1** (chosen 2026-07-21): build on the clean, tested `rehearsal-room-controller` (Stack A) — which already solves the hard real-time problems (mic↔speech interleaving, ordered persistence, session lifecycle) and grounds questions in real deck-reading evidence — and **harvest the persona brains** (prompts, panel-coordination, voice) from the orphaned multi-chat stack (Stack B) onto that path. We keep the rich simulator's brain; we discard its tangled body.

## 2. Scope

**In (this slice):**
- New unshelled immersive route `/rehearse/[sessionId]`.
- Modular engine under `src/features/simulator/` (controller, panel assembly, metrics, turn-selection, engine hook).
- Multi-persona panel (auto-assembled, 2–3 members) with per-persona distinct voices.
- Evidence-grounded persona turns via a generalized `/api/defense/examiner`.
- Live transcript + WPM/filler metrics.
- Responsive desktop + mobile (bottom sheets on mobile).

**Out (explicitly deferred — no dead controls for these):**
- **Camera** self-view + VLM eye-contact/presence → Phase 4b.
- **Screen share** → excluded from the product for now (user decision).
- **Audio recording + replay** → Phase 6.
- **Coaching report** (evidence timeline, personas, drills, scored dimensions) → Phase 7.
- **Persona selection at configure time** → fast-follow; this slice auto-assembles the panel.

## 3. Decisions locked (from brainstorming)

- **Voice-first core now**; camera is a later opt-in (Phase 4b). No camera toggle appears until it works.
- **Camera off by default** when it arrives (honesty: coach skips a dimension rather than fabricating it).
- **Screen share out entirely.**
- **Auto panel:** a fixed 2–3 persona panel suited to a project/thesis defense, assembled from the harvested library — no configure rework this slice.
- **New route `/rehearse/[sessionId]`**, full-viewport, unshelled, its own toolbar.

## 4. Architecture

### 4.1 Route & shell

`src/app/rehearse/[sessionId]/page.tsx` — a client route that loads the session (`GET /api/session/[id]`, reusing `parseDefenseSessionResponse`-style validation), then renders the immersive room outside `AppShell`. Phase 3's `/decks/new` "Start rehearsal" navigation changes from `/practice/[id]?view=room` to `/rehearse/[id]`. The legacy `/practice/[id]?view=room` (old `RehearsalRoom`) remains in place for the existing "Resume rehearsal"/"Continue setup" paths until a later reconciliation phase — this slice does not touch `studio-session-model.ts` or its five dependent test files.

### 4.2 Modular units (`src/features/simulator/`)

Each unit has one responsibility and a well-defined interface:

| Unit | Responsibility | Depends on |
| --- | --- | --- |
| `personas.ts` | The harvested persona definitions (id, title, coaching focus, prompt fragment, voiceId) + the auto-panel assembly `assemblePanel(deck, mode, stance): Persona[]`. | types |
| `metrics.ts` | Pure `computeMetrics(segments): { wpm, fillerCount, fillerRate, spokenMs, wordCount }`. Filler lexicon defined here. | types |
| `turn-selection.ts` | Pure `selectNextSpeaker(panel, events): Persona` — spreads turns so no persona dominates; ties break toward least-recently-spoken. | personas, types |
| `simulation-controller.ts` | Pure state machine generalized from `rehearsal-room-controller`: presenter capture ↔ panel speech interleaving, ordered persistence, lifecycle (idle→presenting→ended), one-persona-at-a-time turns. | types, turn-selection |
| `use-simulation-engine.ts` | React hook binding the controller to real IO: `voice-engine` mic STT + per-persona TTS, wall-clock timers, live metrics, exposing a typed API to the UI. | controller, personas, metrics, voice-engine |
| `SlideStage.tsx` | Hero slide inside the examination frame + slide index badge + prev/next nav. | AuthenticatedSlideImage |
| `AudiencePanel.tsx` | Persona cards showing presence state (`listening` / `thinking` / `speaking`) + the active caption. | personas |
| `TranscriptPanel.tsx` | Live captions (presenter interim + committed segments, persona lines) + running metrics chips. | metrics |
| `SimulatorToolbar.tsx` | Floating Zoom-style control pill: mic toggle, participants toggle, transcript toggle, **End** (destructive). No camera/screen. | buttonVariants |
| `SimulatorRoom.tsx` | Composes the above into the responsive immersive layout; consumes `use-simulation-engine`. | all UI units + hook |

### 4.3 Persona turns (endpoint)

Generalize `POST /api/defense/examiner` to accept an optional `persona` field: `{ id, title, promptFragment }`. Server behavior is unchanged except that, when `persona` is present, the persona's coaching-focus prompt fragment is blended into the LLM system prompt, and the returned event carries `persona` (the persona id + title). The existing **evidence grounding stays**: the server still runs deck reading-analysis and pins the question to the presenter's actual words vs. the slide. Panel-coordination ("other members already asked X — don't repeat; build on it or move to your angle") is added to the prompt using the prior `examinerEvents` (each now persona-tagged). If `persona` is omitted, behavior is byte-for-byte the current single-examiner behavior — the legacy room keeps working.

### 4.4 Data model

- `ExaminerEvent` (type + `createExaminerEventSchema` in `@/features/defense/examiner`) gains an **optional** `persona?: { id: string; title: string }`. Additive and optional → existing serialized events, the legacy room, and the current report all remain valid. No Prisma migration (events are JSON in a text column).
- No new `Session` fields. The panel is auto-derived at room entry from `assemblePanel(deck, mode, stance)`; it is not persisted this slice (it is deterministic from inputs).
- Persistence continues through `PATCH /api/session/[id]` with `{ transcriptSegments, examinerEvents, status }`, exactly as the current controller does.

### 4.5 Voice

- `voice-engine` is reused as-is: `createSTT` (mic → interim + final text), `generateTTS(text, voiceId)` + `playAudioData`, `unlockAudio`.
- `personas.ts` owns the **persona → Cartesia voiceId** map (single source of truth). The known-good default voice (`d46abd1d-2d02-43e8-819f-51fb652c1c61`) is the fallback; each persona is assigned a voiceId from that map. Filling additional distinct Cartesia voice ids is a small, safe config change; the room is fully functional (immersive via on-screen persona presence + captions) even if some personas share the default voice. The map is the seam.

## 5. The panel (auto-assembled, defense-appropriate)

`assemblePanel(deck, mode, stance)` returns a **deterministic fixed 3-member panel** for the project/thesis-defense use case (no slide-count conditional — always these three, in this order):

- **Professor** — methodology, rigor, "walk me through how you arrived at that."
- **Examiner** — assumptions & evidence; the `rigorous` stance amplifies this member's edge, `supportive` softens it.
- **Peer** — clarity & curiosity; asks the "explain it simply" angle.

Persona prompt fragments are ported from `/api/multi-chat`'s `coachPersonas` (professor, plus adapted examiner/peer), trimmed to the defense context. `assemblePanel` is a pure function of its inputs; the panel is not persisted (it is reproducible on room re-entry).

**Mode behavior (preserved from Stack A's controller, now persona-attributed):**
- **`diagnostic`** — the immersive default: a persona interjects **live** (spoken via TTS) shortly after the presenter finishes a grounded point, then capture resumes. `selectNextSpeaker` chooses which member.
- **`mock`** — questions are **queued** during the run and delivered **at the end**, one persona at a time, the presenter answering each before `Continue` (exactly the current mock lifecycle, generalized so each queued question is persona-tagged and spoken in that persona's voice).

## 6. Metrics

`computeMetrics(segments)` (pure) over presenter segments:
- **WPM** = wordCount / (spokenMs / 60000), spokenMs summed from segment `endedAtMs − startedAtMs`.
- **fillerCount / fillerRate** from a filler lexicon (`um, uh, er, like, you know, basically, sort of, kind of, i mean, actually`), case-insensitive, word-boundary matched.
- Returned live and rendered as restrained chips in `TranscriptPanel`. No fabricated dimension appears — only what the transcript supports.

## 7. Immersion & visual language

- Full-viewport dark canvas (`bg-background`); the slide is the hero inside the cobalt **examination frame** (the established signature element).
- `AudiencePanel`: persona cards with a neutral avatar chip (initial), name, and a **presence state** — `listening` (subtle pulse), `thinking` (animated dots), `speaking` (caption + ring). Restrained neutral surfaces with a single cobalt accent — **not** multi-colored AI-slop.
- `SimulatorToolbar`: a floating rounded pill, bottom-center, soft elevation; mic (primary/active), participants, transcript, End (destructive).
- Motion honors `prefers-reduced-motion` (existing global guard).
- Soft-depth tokens throughout (`rounded-xl`, `shadow-e1/e2`, `buttonVariants`).

## 7a. Opening moment — the room must feel alive (added 2026-07-22, user-requested)

The room must **never open in silence**. The moment the user enters and makes the first gesture (a prominent **"Begin"** control — required to satisfy browser autoplay policy via `unlockAudio()`), the **lead persona speaks a short spoken welcome** that (a) greets the speaker, (b) names the panel present ("I'm the Professor — with me are the Examiner and a Peer"), and (c) invites them to start talking when ready. This is the liveness the previous simulator had and is what "immersive" means here.

- **Endpoint reuse:** harvest the existing `POST /api/intro` (`{ title, judges }` → `{ text, judgeId, voice }`). It already produces a 1-sentence LLM welcome from the lead judge with a safe default fallback ("Welcome! Please turn on your microphone whenever you're ready to begin."). We pass the assembled panel as `judges` (each `{ id, title }`) and the session title; the lead persona (panel[0] = Professor) delivers it. If the LLM fails, the default welcome still plays — the room is never silent.
- **Playback:** `generateTTS(text, voice)` + `playAudioData(...)` from the existing `voice-engine`, using the lead persona's `voiceId`. While it plays, that persona's `AudiencePanel` card is in the **speaking** state with the caption; the others show **listening**.
- **Sequencing:** `Begin` → `unlockAudio()` → intro plays (persona speaking) → on finish, mic capture starts and the rehearsal proceeds exactly as the engine already defines. A **Replay intro** affordance re-plays the welcome (mirrors the old sim). Autoplay/playback failure degrades to the caption + a Replay control — never a hard error.
- **Honesty:** the welcome is scripted greeting/logistics only (no coaching claim), so it invents no evidence — consistent with §12.

This opening is a first-class Phase 5 deliverable, not polish: the engine hook owns the intro step and the room UI renders the speaking lead persona.

## 8. Responsive strategy

- **Desktop:** stage centered with the audience panel + transcript alongside (grid, e.g. `lg:grid-cols-[minmax(0,1fr)_22rem]` like the current room).
- **Mobile:** stage is the hero; `AudiencePanel` and `TranscriptPanel` become **bottom sheets** (reusing the shadcn Sheet primitive); toolbar trims to mic · participants · End. A genuine practice room, not a squeezed desktop.

## 9. Error handling

- Microphone unavailable/denied → inline, non-blocking error with a **Retry microphone** affordance (as the current room does); the session continues, capture just stays idle.
- TTS autoplay/playback failure → the persona line still shows as a caption; a **Replay** control retries audio (mirrors `use-examiner-voice`'s `lastError`/replay).
- Persist failure (`PATCH`) → surfaced inline; End/Finish is gated until a successful save, so no rehearsal is silently lost (current controller behavior preserved).
- Persona endpoint failure or empty decision → no event is appended (silent skip, exactly as the current `examine` path handles a null event).

## 10. Testing strategy

- **Pure, unit-tested (Vitest, node env):** `computeMetrics`, `assemblePanel`, `selectNextSpeaker`, and `simulation-controller` (lifecycle, turn ordering, one-at-a-time speaking, ordered persistence, no-op after end) using injected fakes for capture/persist/speak/requestTurn — the same seam pattern the current controller test uses.
- **Endpoint:** extend the existing `/api/defense/examiner` tests to cover the `persona` branch (persona-tagged event returned; grounding preserved; omitted-persona = legacy behavior).
- **UI units:** `renderToStaticMarkup` substring/structure/a11y assertions (persona names, presence states, toolbar controls, transcript labels, examination-frame markup) — no jsdom, per repo convention.
- **Honest limit:** live mic/STT/TTS cannot be unit-tested; verified by driving the real app in-browser at the end of Phase 5 (voice-first walkthrough, both themes, mobile width).
- The existing suite (190 tests) stays green; changes to the shared examiner event schema/endpoint keep legacy tests passing (additive/optional).

## 11. Sequencing (two plans)

1. **Phase 4 — headless engine:** `personas.ts`, `metrics.ts`, `turn-selection.ts`, `simulation-controller.ts`, the `/api/defense/examiner` persona extension + schema field, and `use-simulation-engine.ts` (hook, unit-tested where its logic is pure/injectable). Deliverable: a fully-tested engine with no UI.
2. **Phase 5 — immersive UI + route:** the six UI units, `SimulatorRoom.tsx`, `src/app/rehearse/[sessionId]/page.tsx`, and the Phase-3 navigation repoint. Deliverable: the runnable immersive room, verified in-browser.

Each plan is executed via subagent-driven development with per-task review + a final whole-plan review.

## 12. Constraints & principles

- Reuse existing backend/AI endpoints; the only server change is the additive `persona` extension to `/api/defense/examiner`.
- Keep the engine **UI-agnostic and portable** (native-app tie-breaker): controller/metrics/panel/turn-selection are pure and framework-free; only the hook and components touch React/DOM.
- Honesty over theater: never render a control (camera/screen/record) or a metric the slice cannot honor.
- Preserve the soft-depth visual system; no cyan/old idioms; no colored AI-slop.
- Do not touch `studio-session-model.ts`, `practice-*`, `review-*`, `studio-desk*`, or the legacy `RehearsalRoom` beyond what §4.1/§4.3 additively require.
