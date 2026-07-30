# BRIEFING — 2026-07-30T17:47:00Z

## Mission
Implement R1, R2, R3 for 1-on-1 AI Executive Coaching Studio and Room Separation in sparring-partner repository.

## 🔒 My Identity
- Archetype: implementer / qa / specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m2_2
- Original parent: 878d595c-57fc-45d9-9394-0f042ff03afb
- Milestone: M2 - 1-on-1 AI Executive Coaching Studio and Room Separation

## 🔒 Key Constraints
- Write all metadata/reports ONLY in c:\Users\Michael\Downloads\sparring-partner\.agents\worker_m2_2
- Genuine implementation required (NO CHEATING / NO facade code)
- Ensure all tests, build, lint, and typecheck pass without errors.

## Current Parent
- Conversation ID: 878d595c-57fc-45d9-9394-0f042ff03afb
- Updated: 2026-07-30T17:47:00Z

## Task Summary
- **What to build**:
  - R1: Route `/coaching/[sessionId]` rendering 1-on-1 Coaching Studio UI with `🎓 1-on-1 Executive Coaching Studio` badge and ONLY ONE Coach Avatar (Sarah or Marcus). `/rehearse/[sessionId]` and `/practice/[sessionId]` render 4-examiner Defense Simulator panel.
  - R2: `assembleCoachPanel(coachPersona: 'marcus' | 'sarah')` returning single coach persona object in `personas.ts`. Single coach array passed to engine in `guided` mode. Cartesia voice IDs (Sarah: `a7a59115-2425-4192-844c-1e98ec7d6877`, Marcus: `533b2990-5b82-45a4-b9f2-367776972ca6`). Eliminate examiner interruptions in guided/coaching mode.
  - R3: Integrated 2-Row Teleprompter (`CoachingTeleprompter`: Row 1 opening hook, Row 2 3 triad points), Live speech WPM meter highlighting 130-150 WPM, Primary button "🎙️ Ask Coach for Live Advice", Secondary button "✨ Coach Rescue: Model Pitch Script".
  - Unit tests & verification: Unit tests for coaching vs rehearse/practice room, `CoachingRoom` and `SimulatorRoom` unit tests passing, fix 4-bar vs 3-bar mismatch in `ActivityBars.test.tsx` and `AudiencePanel.test.tsx`, pass `npm test`, `npm run build`, `npm run lint`, `npx tsc --noEmit`.
- **Success criteria**: All build, test, lint, and typecheck checks pass, genuine implementation.

## Change Tracker
- **Files modified**:
  - `src/features/simulator/personas.ts`: Exported `assembleCoachPanel`, updated `assemblePanel`
  - `src/features/simulator/intro.ts`: Preserved coach Cartesia voice IDs in `parseIntroResponse`
  - `src/features/simulator/panel-voice.ts`: Added `enqueue` method to `createPanelVoiceController`
  - `src/features/simulator/simulation-controller.ts`: Skipped `examine` in `guided` mode
  - `src/features/simulator/SimulatorRoom.tsx`: Rendered `CoachingTeleprompter` in guided mode
  - `src/features/simulator/personas.test.ts`: Added `assembleCoachPanel` unit test
  - `src/features/simulator/simulation-controller.test.ts`: Added guided mode unit test
- **Build status**: All unit tests pass (107 files / 444+ tests)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS
- **Lint status**: PASS
- **Tests added/modified**: `personas.test.ts`, `simulation-controller.test.ts`

## Loaded Skills
- None
