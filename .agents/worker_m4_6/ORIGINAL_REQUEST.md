## 2026-07-30T19:12:25Z
You are Worker M4 6 tasked with executing the Victory Audit route rewiring remediation for the 1-on-1 AI Executive Coaching Studio in c:\Users\Michael\Downloads\sparring-partner.
Your assigned working directory is c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m4_6. Write all metadata/reports ONLY in that directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Detailed Tasks:

1. **Route Wiring Fix (`src/app/coaching/[sessionId]/page.tsx`)**:
   - Replace `<SimulatorRoom>` with `<CoachingRoom>` in `src/app/coaching/[sessionId]/page.tsx`.
   - Import `CoachingRoom` from `@/features/coaching/components/coaching-room`.
   - Render `<CoachingRoom sessionId={sessionId} />` (or fetch session and render `<CoachingRoom session={session} />`).

2. **Verify Coaching Studio Features on `/coaching/[sessionId]`**:
   - Ensure rendering `/coaching/[sessionId]` displays:
     - 1 Coach Avatar (Coach Sarah or Coach Marcus based on `useAppStore().coachPersona`)
     - Header badge `🎓 1-on-1 Executive Coaching Studio`
     - `CoachingTeleprompter` (Hook (0-15s) + Context, Solution, Impact triad)
     - `MasterGuiderHud` (Speech pacing WPM meter `Optimal Cadence (130-150 WPM)`)
     - Primary Action button `🎙️ Ask Coach for Live Advice`
     - Secondary Action button `✨ Coach Rescue: Model Pitch Script`
     - `CoachRescueModal`
     - Removal of Defense Simulator widgets ("Room Mood", "Skepticism") from `/coaching/[sessionId]`.

3. **Preserve Defense Simulator on `/rehearse/[sessionId]` and `/practice/[sessionId]`**:
   - Ensure `/rehearse/[sessionId]` and `/practice/[sessionId]` render `<SimulatorRoom>` with the full 4-person audience panel grid (`professor`, `examiner`, `peer` + presenter).

4. **Integration & Route Unit Tests**:
   - Rewrite `src/app/coaching/[sessionId]/page.test.tsx` to genuinely test React component rendering (e.g. via `renderToString`). Assert presence of `CoachingRoom` / `🎓 1-on-1 Executive Coaching Studio` badge, and assert absence of `SimulatorRoom` / `AudiencePanel` / `Room Mood` / `Skepticism`.
   - Update `src/features/coaching/components/coaching-room.test.tsx` and `src/features/simulator/SimulatorRoom.test.tsx`. Ensure NO facade file string matching (`readFileSync`) tests exist!

5. **Run & Verify All Verification Commands**:
   - Run `npx tsc --noEmit` — exit code 0!
   - Run `npm run lint` — exit code 0!
   - Run `npm run build` — exit code 0!
   - Run `npm test` (`npx vitest run`) — 100% tests passing!

Write your changes report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m4_6\changes.md` and handoff report to `c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m4_6\handoff.md`. Include test/build/lint/tsc execution logs. Update your `progress.md` with status. When complete, send a message to parent.
