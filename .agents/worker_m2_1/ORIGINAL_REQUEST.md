## 2026-07-30T17:34:02Z
You are Worker M2 1 implementing the 1-on-1 AI Executive Coaching Studio and Room Separation in the repository at c:\Users\Michael\Downloads\sparring-partner.
Your assigned working directory is c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m2_1. Write all your metadata/reports ONLY in that working directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Detailed Tasks for Milestone 2 & Milestone 3 Implementation:

1. **R1: Distinct 1-on-1 Coaching Studio UI & Room Separation**:
   - Verify `/coaching/[sessionId]` route (in `src/app/coaching/[sessionId]/page.tsx`). Ensure it renders a dedicated 1-on-1 Coaching Studio (`CoachingRoom` component or `SimulatorRoom` in `mode: 'guided'`).
   - Header Badge: Display the distinct header badge `🎓 1-on-1 Executive Coaching Studio` when in coaching studio mode.
   - Audience Panel / Coach Avatar: When in coaching mode (`mode === 'guided'`), display ONLY ONE Coach Avatar (Coach Sarah or Coach Marcus based on `useAppStore().coachPersona` or session setting), NOT the 4-person audience panel grid.
   - Preserved Defense Simulator: Ensure `/rehearse/[sessionId]` and `/practice/[sessionId]` open the 4-examiner Defense Simulator with the full 4-person audience panel grid (`professor`, `examiner`, `peer` + presenter).

2. **R2: Single Coach Persona & Spoken Guidance**:
   - Ensure ONLY the selected Coach persona (Coach Sarah or Coach Marcus) speaks during coaching sessions (room intro, slide tips, live advice).
   - Use Coach Sarah's Cartesia Voice ID `'a7a59115-2425-4192-844c-1e98ec7d6877'` (Amber) when Coach Sarah is selected.
   - Use Coach Marcus's Cartesia Voice ID `'533b2990-5b82-45a4-b9f2-367776972ca6'` (Reed) when Coach Marcus is selected.
   - Eliminate all 4-examiner event loops and examiner interruption calls (`examine(segment)` and `POST /api/defense/examiner`) when in coaching mode (`mode === 'guided'`).

3. **R3: Integrated Delivery Teleprompter & Speech Pacing**:
   - Teleprompter: Include a 2-row delivery guide teleprompter in the Coaching Studio featuring:
     - Row 1: Opening Hook.
     - Row 2: 3 Horizontal Triad Talking Points: Context, Solution, Impact.
   - Speech Pacing (WPM Meter): Live speech WPM meter with optimal cadence indicator highlighting the optimal 130–150 WPM range.
   - Primary Action: **"🎙️ Ask Coach for Live Advice"** button that transcribes presenter's actual speech and speaks custom advice aloud in the selected coach's voice.
   - Secondary Action: **"✨ Coach Rescue: Model Pitch Script"** button.

4. **Testing & Verification**:
   - Ensure unit tests exist and pass for both `CoachingRoom` and `SimulatorRoom`.
   - Update or add tests in `src/features/simulator` or `src/features/coaching` verifying:
     - Navigating/rendering `/coaching/[id]` opens 1-on-1 Coaching Studio with 1 coach avatar.
     - Navigating/rendering `/rehearse/[id]` or `/practice/[id]` opens 4-examiner Defense Simulator.
     - `ActivityBars` test assertions match the rendered bar count.
   - Run tests using `npm test` or `npx vitest run`. Ensure all unit tests pass!

Write your changes report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m2_1\changes.md` and handoff report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m2_1\handoff.md`. Include test commands and test execution output in handoff.md. Update your `progress.md` with status. When complete, send a message to parent.
