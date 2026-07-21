# Sparring Partner — Product Requirements & Slice 1 Design

**Status:** Approved design (2026-07-21). Captures the full product vision; **Slice 1** is detailed for immediate implementation. Later phases are described but not yet specced.

---

## 1. Mission

Sparring Partner makes people better **speakers and presenters** by putting them in a realistic, high-pressure practice room with an AI audience, then coaching them with a specificity no general chatbot can match — **because we have the tape.** ChatGPT can give advice; it cannot watch you present, hear how you said it, and remember you across sessions. That gap is the product.

## 2. Target users

- **Now:** people rehearsing a **project/thesis defense** or a **slide presentation**.
- **Later (vision, not Slice 1):** **job-interview** simulation and other high-stakes speaking; plus a lighter **daily speaking practice / challenges** loop for habit-building between big rehearsals.

The same core simulation engine serves all of these — future modes are new *audiences/personas*, not new apps.

## 3. The moat — comprehensive coaching

Four reinforcing pillars, all required for the differentiated coach:

1. **Evidence-grounded.** Every finding is pinned to exact evidence: `mm:ss` timestamp + slide + the transcript line you actually said + camera/screen signal. e.g. *"2:14, Slide 4: you read three lines verbatim and looked away from camera."* Not generic advice.
2. **Longitudinal / personal.** A persistent model of *you* (`SpeakerProfile`) that tracks recurring weaknesses across every session and coaches the pattern, not just today's talk. e.g. *"Fillers down 30% over 3 sessions, but you still rush your closings."*
3. **Actionable drills.** Diagnosis → prescription. Each report ends with 1–3 concrete next exercises (re-run Q&A on Slide 3; 60-second impromptu defending your methodology; pacing drill on the closing only).
4. **Multi-persona pressure.** The AI audience is a panel of distinct personas (skeptical examiner, curious student, tough investor…), each probing a different angle, so feedback spans many perspectives in one session.

These compound: evidence feeds the longitudinal model, which prescribes the drills, across the personas.

## 4. Information architecture

Three primary destinations (replacing the retired Today / Practice / Review):

| Destination | Purpose |
| --- | --- |
| **Home** | The coach's front door: resume last session, the **one** weakness to work on today, today's challenge (later), streak (later). |
| **Rehearse** | Launch a simulation: a clean setup (source + audience) → the live room. |
| **Progress** | The longitudinal coach: session history, growth charts, the recurring-weakness profile, and per-session evidence reports (with audio replay). |

This absorbs every future piece with **no nav rework**: interview mode becomes an audience choice inside Rehearse; daily practice becomes a Home card plus its own lightweight room.

### Global top bar

A sticky top bar on every **shelled** page (Home / Rehearse / Progress — **not** the immersive rehearsal room, which has its own toolbar):

- **Left:** hamburger — on mobile opens the nav drawer; on desktop toggles rail collapse/expand. Plus the current page title.
- **Right:** the **theme toggle** (relocated here from the sidebar footer) and an **account menu** (avatar → sign out).

The sidebar rail keeps the nav (Home / Rehearse / Progress) and the "New rehearsal" action. The theme toggle leaves the rail entirely. The rail remains collapsible with persisted state (already implemented via `readShellCollapsed`/`writeShellCollapsed`).

---

## 5. Slice 1 — scope

Build now:

1. **New IA + global top bar** (hamburger, relocated theme toggle, account menu).
2. **Rehearse setup/configure** screen — clean, guided.
3. **Modular simulator** (defense + presentation), responsive desktop/mobile.
4. **Audio** session recording + replay.
5. **Comprehensive coaching report** (evidence-grounded, multi-persona, drills).
6. **`User` + `SpeakerProfile`** schema + longitudinal Home/Progress.

Explicitly **not** in Slice 1 (see §11): daily practice/challenges, streaks/gamification, interview mode, video capture, deeper analytics.

### 5.1 Rehearse setup (the configure screen)

Replaces the messy 727-line `configure-section`. Restyled in the soft-depth system, one decision per section:

- **Step 1 — What are you rehearsing?** Source: upload deck · share screen · topic prompt. Plus a title. Slide thumbnails preview after upload.
- **Step 2 — Who's in the room?** Audience type (defense panel · presentation audience; interview later), persona selection, audience size, stance (supportive ↔ rigorous), interruption frequency.
- **Start rehearsal** → creates the session → enters the live room.

Reuses the real intake logic (deck upload, session creation) presented cleanly.

### 5.2 The simulator

Full-viewport, **unshelled** room at `/rehearse/[sessionId]`, with its own top toolbar. Replaces the 1,597-line `present-section.tsx` monolith with focused units under `src/features/simulator/`:

| Unit | Responsibility |
| --- | --- |
| `use-simulation-engine.ts` | The brain: mic/ASR, TTS playback, timers, WPM/filler metrics, camera + screen capture loops, audience turn-taking. One hook, well-defined API. |
| `SlideStage.tsx` | Main stage: slides / shared screen / topic card. |
| `CameraPip.tsx` | Draggable self-view (optional; off by default). |
| `AudiencePanel.tsx` | The AI panel: personas + speaking/listening/typing status. |
| `SimulatorToolbar.tsx` | mic · camera · screen · participants · transcript · End. |
| `TranscriptPanel.tsx` | Live captions + running metrics. |

**Reuses existing APIs unchanged:** `/api/multi-chat` (+`/stream`) for the audience, `/api/analyze-frame` (camera VLM), `/api/analyze-screen` (screen VLM), `/api/tts` (per-persona voices), `/api/transcribe` (ASR), `/api/score` (report).

**Capture is opt-in and honest.** Voice is always on. **Camera and screen are optional, off by default**, one-tap toggles. If a signal is off, the coach **skips** those dimensions rather than inventing scores — this protects the evidence-grounded promise.

**Audio recording.** The session's microphone audio is persisted (leveraging the existing `Session.audioPath` field and `/api/session/[id]/audio` route) and replayable later from the report. Audio only — no video.

**In-room coaching is light-touch:** personas interject by voice (e.g. "you read that verbatim — say it in your own words") to keep pressure real without breaking flow. The comprehensive coaching is post-session (§5.3).

### 5.3 The coaching report

Generated when the user ends the session, from the full capture (transcript + timestamps, slide changes, verbatim-reading detection, WPM/filler trends, and camera/screen VLM signals when enabled):

- **Timeline of moments** — each finding pinned to `mm:ss` + slide + the exact line said.
- **Multi-persona verdicts** — each panel member's distinct take.
- **Scored dimensions** — via existing `/api/score` (clarity, confidence, technical, storytelling, persuasiveness, conciseness, verbatim; + eyeContact/posture/cameraPresence when camera on).
- **Prescribed drills** — 1–3 concrete next exercises.
- **Audio replay** — a player for the session recording. Timeline-sync (tap a finding → audio jumps to that `mm:ss`) is a **fast-follow** if it adds risk to the first cut.

### 5.4 Longitudinal (Home + Progress)

After each session, the report is diffed into the user's `SpeakerProfile`. **Home** surfaces the single "work on this next" item and a resume affordance; **Progress** shows history, growth charts, and the recurring-weakness profile. The sentence *"fillers down 30% over 3 sessions, but you still rush closings — today's drill targets closings"* is the moat made visible, and depends entirely on this data.

---

## 6. Data model & schema changes

Current (SQLite via Prisma): `Session` (nullable `userId`, deck/transcript/examiner/findings/status, `audioPath`), `Message`, `Score` (10 dimensions + feedback/weaknesses/recommendations/knowledgeGaps/judgeFeedback). Missing the longitudinal layer.

**Additive migrations (Slice 1):**

```
model User {
  id           String   @id            // Firebase UID
  email        String?
  displayName  String?
  createdAt    DateTime @default(now())
  profile      SpeakerProfile?
  // sessions relate via Session.userId
}

model SpeakerProfile {
  id                 String   @id @default(cuid())
  userId             String   @unique
  recurringWeaknesses String  @default("[]") // [{ label, trend, lastSeen }]
  dimensionBaselines String   @default("{}") // rolling averages per dimension
  totalSessions      Int      @default(0)
  streak             Int      @default(0)    // used by later daily-practice phase
  nextFocus          String   @default("")   // the "one thing to work on"
  updatedAt          DateTime @updatedAt
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

`User` is keyed off the existing Firebase auth UID. `Session.userId` becomes a real relation to `User`. Both are additive; existing rows with null `userId` remain valid. `Score` and `Session` are otherwise unchanged.

## 7. Responsive strategy (mobile + desktop, first-class)

- **Desktop:** full experience — slides/screen stage, draggable camera PiP, audience panel, Zoom-style toolbar.
- **Mobile:** voice-first — slides + camera + audience all work; **screen share is hidden** (mobile browsers cannot `getDisplayMedia`). Toolbar collapses to essentials (mic, camera, participants, End); audience panel and transcript become bottom sheets. Mobile is a genuine practice room, not a broken desktop layout.
- All shelled pages and the configure screen are fluid; the top bar and drawer are the mobile navigation.

## 8. Testing strategy

- **Vitest for pure logic** — engine state reducers, WPM/filler math, report assembly, `SpeakerProfile` aggregation, session→model mappers. Correctness lives here.
- **Component tests** in the repo's existing style (`renderToStaticMarkup` / source-substring) for the configure screen, report, and shell.
- **Honest limit:** live media (mic/camera/screen/TTS) cannot be unit-tested — verified by driving the real app in-browser each phase.
- The existing **170 tests stay green** throughout.

## 9. Implementation sequencing

Slice 1 is sizable and will be planned as **ordered, independently-reviewable phases** (same disciplined subagent-driven flow already used on this project):

1. Foundation & schema (`User`, `SpeakerProfile`, migrations, model/types).
2. Shell + global top bar (hamburger, relocated theme toggle, account menu).
3. Rehearse setup/configure screen.
4. Simulator engine (`use-simulation-engine` + media/voice/metrics), headless-testable core.
5. Simulator UI (SlideStage, CameraPip, AudiencePanel, Toolbar, TranscriptPanel) + responsive.
6. Audio recording + replay.
7. Coaching report (evidence timeline, personas, drills).
8. Longitudinal wiring (Home + Progress from `SpeakerProfile`).

The writing-plans step will turn this into the detailed task-by-task plan.

## 10. Constraints & principles

- Preserve the soft-depth visual system established in the prior redesign; everything new is styled in it from the start (no cyan/old idioms).
- Reuse existing backend APIs; do not rebuild the AI endpoints.
- The orphaned `src/components/*-section.tsx` monolith is the **reference/source of logic**, not code to restyle in place — logic is ported into the modular engine, then the orphaned files are retired once superseded.
- Honesty over theater: never fabricate a coaching signal (score, camera metric, evidence) the capture did not produce.

## 11. Later phases (vision, not Slice 1)

- **Daily speaking practice + challenges + streaks/gamification** — a lightweight, deckless room + Home loop.
- **Job-interview mode** — a new persona pack + configure preset inside Rehearse.
- **Timeline-synced audio** (if not already folded into Slice 1), deeper analytics dashboards.
- **Video** capture/replay — explicitly deferred; audio only for now.

## 12. Open risks

- **Media on mobile** varies by browser/OS; the mobile room must degrade gracefully (feature-detect `getDisplayMedia`, permissions handling).
- **Latency** of the multi-persona voice loop under real network conditions — must feel like a conversation, not a lag.
- **SQLite** is fine for now but is a single-writer store; a future hosted deployment may need a managed DB. Not a Slice 1 blocker.
