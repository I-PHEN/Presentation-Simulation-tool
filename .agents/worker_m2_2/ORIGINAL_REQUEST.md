## 2026-07-30T17:40:56Z
You are Worker M2 2 implementing R1, R2, and R3 for the 1-on-1 AI Executive Coaching Studio and Room Separation in the repository at c:\Users\Michael\Downloads\sparring-partner.
Your assigned working directory is c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m2_2. Write all your metadata/reports ONLY in that working directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Technical Blueprint & Implementation Tasks:

1. **R1: Distinct 1-on-1 Coaching Studio UI & Room Separation**:
   - Route `/coaching/[sessionId]`: In `src/app/coaching/[sessionId]/page.tsx`, render the 1-on-1 Coaching Studio interface (`CoachingRoom` component or `SimulatorRoom` configured for coaching mode).
   - Header Badge: In `src/features/coaching/components/coaching-header.tsx` (and `SimulatorRoom` header when in coaching mode), ensure the header badge text reads `🎓 1-on-1 Executive Coaching Studio`.
   - Coach Avatar: When in coaching mode, display ONLY ONE Coach Avatar (Coach Sarah or Coach Marcus, based on `useAppStore().coachPersona`), NOT the 4-person audience panel grid.
   - Preserved 4-Examiner Defense Simulator: In `src/app/rehearse/[sessionId]/page.tsx` and `src/app/practice/[sessionId]/page.tsx`, ensure navigating to `/rehearse/[id]` or `/practice/[id]` renders `SimulatorRoom` with the full 4-person audience panel grid (`professor`, `examiner`, `peer` + presenter).

2. **R2: Single Coach Persona & Spoken Guidance**:
   - In `src/features/simulator/personas.ts`, create `assembleCoachPanel(coachPersona: 'marcus' | 'sarah')` returning a single coach persona object.
   - In `src/features/simulator/use-simulation-engine.ts`, when `mode === 'guided'`, pass the single coach panel array to `panel` and `AudiencePanel`.
   - Cartesia Voice IDs: Ensure room intro greeting and `askCoachForAdvice()` use the selected coach persona's Cartesia Voice ID:
     - Coach Sarah: `'a7a59115-2425-4192-844c-1e98ec7d6877'` (Amber)
     - Coach Marcus: `'533b2990-5b82-45a4-b9f2-367776972ca6'` (Reed)
   - Eliminate Examiner Interruptions: In `src/features/simulator/simulation-controller.ts`, skip `examine(segment)` and `POST /api/defense/examiner` calls when `mode === 'guided'` so no 4-examiner event loops or interruptions occur in coaching mode.

3. **R3: Teleprompter, WPM Speech Pacing & Live Advice Actions**:
   - Integrated 2-Row Teleprompter: Include `CoachingTeleprompter` in the Coaching Studio featuring:
     - Row 1: Opening Hook.
     - Row 2: 3 Horizontal Triad Talking Points: Context, Solution, Impact.
   - Speech Pacing (WPM Meter): Live speech WPM meter with optimal cadence indicator highlighting 130–150 WPM.
   - Primary Action Button: **"🎙️ Ask Coach for Live Advice"** (transcribes presenter speech and speaks custom advice aloud in the selected coach's voice).
   - Secondary Action Button: **"✨ Coach Rescue: Model Pitch Script"** (opens Coach Rescue modal pitch script).

4. **Unit Tests & Verification**:
   - Write/update unit tests in `src/features/simulator` and/or `src/features/coaching` verifying:
     - Rendering `/coaching/[id]` opens 1-on-1 Coaching Studio with 1 coach avatar and header badge `🎓 1-on-1 Executive Coaching Studio`.
     - Rendering `/rehearse/[id]` or `/practice/[id]` opens 4-examiner Defense Simulator with 4-person panel.
     - `CoachingRoom` and `SimulatorRoom` unit tests pass.
   - Fix any 4-bar vs 3-bar mismatch in `ActivityBars.test.tsx` and `AudiencePanel.test.tsx` so all unit tests pass.
   - Run `npm test` (`npx vitest run`), `npm run build`, `npm run lint`, and `npx tsc --noEmit`. Ensure ALL build, test, lint, and typecheck steps PASS!

Write your changes report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m2_2\changes.md` and handoff report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m2_2\handoff.md`. Include test commands and test execution output. Update your `progress.md` with status. When complete, send a message to parent.
