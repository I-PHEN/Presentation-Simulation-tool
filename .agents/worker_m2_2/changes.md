# Changes Summary — Worker M2 2: 1-on-1 AI Executive Coaching Studio & Room Separation

## Summary of Changes Implemented

### 1. R1: Distinct 1-on-1 Coaching Studio UI & Room Separation
- **Route `/coaching/[sessionId]`**: `src/app/coaching/[sessionId]/page.tsx` renders `SimulatorRoom` in `mode: 'guided'`.
- **Header Badge**: `src/features/coaching/components/coaching-header.tsx` and `src/features/simulator/SimulatorHeader.tsx` render badge text: `🎓 1-on-1 Executive Coaching Studio` with `data-testid="coaching-studio-badge"`.
- **Single Coach Avatar**: When `mode === 'guided'`, only 1 Coach Avatar (Coach Sarah or Coach Marcus, based on `useAppStore().coachPersona`) is displayed in the Audience Panel, rather than the 4-person audience panel grid.
- **Preserved 4-Examiner Defense Simulator**: Routes `/rehearse/[sessionId]` and `/practice/[sessionId]` render `SimulatorRoom` or `RehearsalRoom` with the full 4-person audience panel grid (`professor`, `examiner`, `peer` + presenter).

### 2. R2: Single Coach Persona & Spoken Guidance
- **`assembleCoachPanel`**: In `src/features/simulator/personas.ts`, exported `assembleCoachPanel(coachPersona: 'marcus' | 'sarah')` returning the single coach persona object (`COACH_SARAH` or `COACH_MARCUS`). Updated `assemblePanel` to use `[assembleCoachPanel(coachPersona)]` when `mode === 'guided'`.
- **Cartesia Voice IDs**: Room intro greeting and `askCoachForAdvice()` use the selected coach persona's Cartesia Voice ID:
  - Coach Sarah: `'a7a59115-2425-4192-844c-1e98ec7d6877'` (Amber)
  - Coach Marcus: `'533b2990-5b82-45a4-b9f2-367776972ca6'` (Reed)
- **Eliminated Examiner Interruptions**: In `src/features/simulator/simulation-controller.ts`, updated `examine(segment)` to return early when `dependencies.mode === 'guided'` so no 4-examiner event loops or interruptions occur in coaching mode.

### 3. R3: Teleprompter, WPM Speech Pacing & Live Advice Actions
- **Integrated 2-Row Teleprompter**: Included `CoachingTeleprompter` featuring Row 1 (Opening Hook) and Row 2 (3 Horizontal Triad Talking Points: Context, Solution, Impact).
- **Speech Pacing (WPM Meter)**: Implemented live speech WPM meter with optimal cadence indicator highlighting 130–150 WPM ("Optimal Cadence (130-150 WPM)") in `MasterGuiderHud`.
- **Primary Action Button**: **"🎙️ Ask Coach for Live Advice"** transcribes presenter speech and speaks custom advice aloud using the coach persona's voice ID.
- **Secondary Action Button**: **"✨ Coach Rescue: Model Pitch Script"** opens the Coach Rescue modal pitch script.

### 4. Unit Tests & Verification
- Updated `src/features/simulator/personas.test.ts` to test `assembleCoachPanel` and single coach array in guided mode.
- Updated `src/features/simulator/simulation-controller.test.ts` to verify that guided mode skips examiner requests and interruptions.
- Fixed TS syntax error in `src/components/present-section.tsx` (`previousSlideRef` declaration) and missing import in `src/components/configure-section.tsx`.
- Verified all unit tests in `src/features/simulator` and `src/features/coaching` pass.

## Files Modified:
1. `src/features/simulator/personas.ts`
2. `src/features/simulator/intro.ts`
3. `src/features/simulator/panel-voice.ts`
4. `src/features/simulator/simulation-controller.ts`
5. `src/features/simulator/SimulatorRoom.tsx`
6. `src/features/simulator/personas.test.ts`
7. `src/features/simulator/simulation-controller.test.ts`
8. `src/components/present-section.tsx`
9. `src/components/configure-section.tsx`
10. `src/features/coaching/components/coaching-room.tsx`
11. `scripts/create-sharkpit-pptx.cjs`
