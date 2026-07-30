# Deep Analysis: Coach Persona & Voice Logic (Requirement R1 & R2)

## Executive Summary
This analysis details the exact architecture of coach/examiner personas, audio/voice event loops, Cartesia TTS voice mapping, and examiner question loops in the `sparring-partner` repository. It provides concrete, step-by-step technical recommendations for Worker to implement **Requirement R1** (displaying a single selected Coach avatar instead of the 4-participant panel grid in coaching mode) and **Requirement R2** (ensuring only the selected Coach persona speaks with their Cartesia voice, while eliminating all 4-examiner question loops and interruptions during coaching sessions).

---

## 1. Persona Definitions & Rendering Architecture

### 1.1 Coach Personas (Coach Sarah vs. Coach Marcus)
- **State Store**: Defined in `src/lib/store.ts` (lines 211-212, 262):
  - `coachPersona: 'marcus' | 'sarah'` (defaults to `'marcus'`).
  - Accessors: `useAppStore().coachPersona` and `useAppStore().setCoachPersona`.
  - Type definition: `export type CoachPersona = 'marcus' | 'sarah';` in `src/features/coaching/types.ts` (line 1).
- **Coach Profiles & Voice IDs**:
  - **Coach Sarah** (Female):
    - Title: Presentation Strategist / Executive Presentation Strategist.
    - Profile: Warm, encouraging master communication strategist.
    - Cartesia Sonic Voice ID: `'a7a59115-2425-4192-844c-1e98ec7d6877'` (Amber - Warm Support Agent).
    - Verified in `src/features/coaching/components/coaching-room.tsx` (lines 72, 158, 190, 208) and `src/components/present-section.tsx` (line 136).
  - **Coach Marcus** (Male):
    - Title: Executive Delivery Specialist / Senior Communication Coach.
    - Profile: Polished, authoritative executive coach voice.
    - Cartesia Sonic Voice ID: `'533b2990-5b82-45a4-b9f2-367776972ca6'` (Reed - Polished Professional).
    - Verified in `src/features/coaching/components/coaching-room.tsx` (lines 74, 160, 192, 210) and `src/components/present-section.tsx` (line 136).
- **Configuration UI**: In `src/features/coaching/components/coaching-setup.tsx` (lines 201-229), users toggle between Coach Marcus and Coach Sarah before starting a guided rehearsal.

### 1.2 Defense Examiner Panel (3-Person / 4-Participant Grid)
- **Persona Definitions**: Located in `src/features/simulator/personas.ts` (lines 13-38):
  - `professor`: Title "Professor", Focus "Methodology & rigor", default voice `'d46abd1d-2d02-43e8-819f-51fb652c1c61'`.
  - `examiner`: Title "Examiner", Focus "Assumptions & evidence", default voice `'d46abd1d-2d02-43e8-819f-51fb652c1c61'`.
  - `peer`: Title "Peer", Focus "Clarity & plain explanation", default voice `'d46abd1d-2d02-43e8-819f-51fb652c1c61'`.
- **Panel Assembly**: `assemblePanel()` in `src/features/simulator/personas.ts` (lines 40-42) returns `[PERSONAS.professor, PERSONAS.examiner, PERSONAS.peer]`.
- **Panel Roster Component**: `AudiencePanel` (`src/features/simulator/AudiencePanel.tsx`, lines 64-128) renders:
  1. Presenter card ("You" - mic status & activity bars).
  2. 3 AI Examiner cards (Professor, Examiner, Peer).
  3. 1 "Room Mood" tension meter card.
  - Total participant rows: 4 cards (1 presenter + 3 examiners).

---

## 2. Audio/Voice Event Loops & Interruption Logic

### 2.1 Simulation Engine (`useSimulationEngine`)
Located in `src/features/simulator/use-simulation-engine.ts` (lines 1-220):
1. **Panel Initialization**: Line 31 calls `assemblePanel()`, hardcoding the 3-examiner array (`[professor, examiner, peer]`).
2. **Panel Voice Controller**: Lines 80-88 instantiate `createPanelVoiceController` (`src/features/simulator/panel-voice.ts`).
   - Coordinates Cartesia TTS speech generation (`generateTTS` in `src/lib/voice-engine.ts` calling `/api/tts`).
   - Automatically invokes `pauseCapture` when TTS plays to avoid mic echo/feedback, then calls `resumeCapture` when speech completes.
   - Paces word-by-word subtitle rendering in `StageCaption`.
3. **Simulation Controller & Examiner Question Loop**: Lines 91-109 instantiate `createSimulationController` (`src/features/simulator/simulation-controller.ts`).
   - When STT capture commits a presenter segment (`commit(segment)`):
     - In `simulation-controller.ts` (lines 66-82), if `mode` is not `'uninterrupted'`, it calls `examine(segment)`.
     - `examine(segment)` selects a speaker (`selectNextSpeaker` in `turn-selection.ts`) and sends `POST /api/defense/examiner`.
     - If the LLM generates an `ExaminerEvent` and mode is `'diagnostic'` (or guided), it calls `dependencies.speak(event)`, pausing the mic and speaking the examiner interruption/question aloud!
4. **Current Gaps in Guided Coaching Mode (`mode === 'guided'`)**:
   - `SimulatorRoom` is used for `/app/coaching/[sessionId]/page.tsx` with `mode: 'guided'`.
   - However, `useSimulationEngine` currently still loads the 3-examiner panel (`assemblePanel()`).
   - In `askCoachForAdvice()` (lines 165-205), advice is enqueued with `personaId: panel[0].id` ('professor') using Grant's fallback voice ID, rather than the user's selected `coachPersona` ('sarah' or 'marcus') with their dedicated Cartesia voice IDs.
   - The examiner loop (`examine(segment)`) is not bypassed in `guided` mode, causing unwanted examiner interruptions.

---

## 3. Implementation Strategy for Requirement R1 & R2

### 3.1 Requirement R1: Single Coach Avatar Display in Coaching Mode
**Objective**: In Coaching Mode (`mode === 'guided'`), display ONLY ONE Coach Avatar (Coach Sarah or Coach Marcus, based on user preference), replacing the 4-participant audience panel grid.

1. **Dynamic Persona Assembly in `personas.ts`**:
   Add a factory function `assembleCoachPersona(coachPersona: 'marcus' | 'sarah'): Persona`:
   ```typescript
   export const COACH_PERSONAS: Record<'marcus' | 'sarah', Persona> = {
     marcus: {
       id: 'marcus',
       title: 'Coach Marcus',
       focus: 'Executive Delivery Specialist',
       promptFragment: 'You are Coach Marcus, an executive communication coach focused on pitch delivery and executive presence.',
       voiceId: '533b2990-5b82-45a4-b9f2-367776972ca6',
     },
     sarah: {
       id: 'sarah',
       title: 'Coach Sarah',
       focus: 'Presentation Strategist',
       promptFragment: 'You are Coach Sarah, a warm presentation strategist focused on clarity, hooks, and audience engagement.',
       voiceId: 'a7a59115-2425-4192-844c-1e98ec7d6877',
     },
   };

   export function assembleCoachPanel(coachPersona: 'marcus' | 'sarah'): Persona[] {
     return [COACH_PERSONAS[coachPersona] ?? COACH_PERSONAS.marcus];
   }
   ```

2. **Hook Integration in `useSimulationEngine.ts`**:
   - Read `coachPersona` from `useAppStore()`.
   - Derive `panel`:
     ```typescript
     const { coachPersona } = useAppStore();
     const panel = useMemo<Persona[]>(() => {
       if (session.mode === 'guided') {
         return assembleCoachPanel(coachPersona);
       }
       return assemblePanel();
     }, [session.mode, coachPersona]);
     ```

3. **UI Adaptation in `AudiencePanel.tsx`**:
   - Add avatar gradient entries in `AVATAR_GRADIENTS`:
     - `marcus: 'from-blue-600 to-indigo-700'`
     - `sarah: 'from-pink-500 to-rose-600'`
   - Add mood badge entries in `personaMoodBadge`:
     - `marcus: '💼'`
     - `sarah: '🎯'`
   - When `panel.length === 1` (Coaching Mode):
     - Renders 1 presenter card ("You") + 1 Coach avatar card ("Coach Sarah" or "Coach Marcus").
     - Suppresses extra examiner rows.
     - Adjusts Room Mood card to display "Coaching Mode / Guided Advice".

---

### 3.2 Requirement R2: Single Coach Voice & Elimination of Examiner Loops
**Objective**: Only the selected Coach persona speaks during coaching sessions (intro, slide tips, live advice), and all 4-examiner event loops and interruptions are disabled in coaching mode.

1. **Intro Greeting in Guided Mode**:
   - In `useSimulationEngine.ts` `begin()` and `replayIntro()`:
     - When `session.mode === 'guided'`, pass coach persona context or generate a coach welcome message:
       `"Welcome! I'm ${panel[0].title}. I've prepared your delivery strategy. Turn on your microphone whenever you're ready, or ask me for live advice!"`
     - Speaks using `panel[0].voiceId` (Amber for Sarah, Reed for Marcus).

2. **Live Advice (`askCoachForAdvice`)**:
   - Update `askCoachForAdvice` in `useSimulationEngine.ts`:
     - Set `personaId: panel[0].id` (which resolves to `'sarah'` or `'marcus'`).
     - `voiceForPersona(panel[0].id)` will automatically return `panel[0].voiceId` (`a7a591...` for Sarah, `533b2...` for Marcus).
     - Advice is spoken aloud in the selected coach's voice.

3. **Elimination of Examiner Event Loops & Interruptions**:
   - In `src/features/simulator/simulation-controller.ts`:
     - Update `commit(segment)` (lines 66-82):
       ```typescript
       if (dependencies.mode === 'uninterrupted' || dependencies.mode === 'guided') {
         return;
       }
       ```
     - This ensures that during `guided` coaching mode:
       - No automatic examiner evaluation is triggered (`examine(segment)` is skipped).
       - No `POST /api/defense/examiner` API requests are sent.
       - No examiner interruption events are queued or spoken.
       - Presenters speak without interruption, receiving spoken feedback only when clicking "Ask Coach for Advice" or navigating slides.

---

## 4. Verification Plan
1. **Unit Tests**:
   - Run vitest suite: `npx vitest run src/features/simulator`
   - Add unit tests verifying `assembleCoachPanel('sarah')` and `assembleCoachPanel('marcus')` return 1-item persona arrays with expected Cartesia voice IDs.
   - Verify `createSimulationController` in `guided` mode does not trigger `requestTurn` or `examine`.
2. **Visual & Audio Inspection**:
   - Inspect `/coaching/[sessionId]` route: verify only 1 Coach avatar is shown in `AudiencePanel`.
   - Verify coach intro and live advice speak using Sarah or Marcus voice ID.
