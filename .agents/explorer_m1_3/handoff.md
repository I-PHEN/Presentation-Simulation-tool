# Handoff Report: Teleprompter, WPM Meter, Pitch Rescue & Test Explorer

## 1. Observation

- **Project Configuration**:
  - `package.json` line 10 specifies `"test": "vitest run"`.
  - `vitest.config.ts` line 11 specifies `environment: 'node'`.
  - Test command execution: `npm test` completed successfully with `103 passed` test files and `439 passed` tests in 58.06 seconds.

- **Teleprompter Component**:
  - File: `src/features/coaching/components/coaching-teleprompter.tsx`
  - Line 24-26: `headerLabel` handles both topic and slide sessions (`Topic Delivery Guide & Spoken Triad` vs `Slide X Delivery Guide & Talking Points`).
  - Lines 77-80: Opening Hook rendered in 1st row: `<span className="text-xs"><strong className="text-primary font-semibold">Hook (0-15s):</strong> &ldquo;{activeScript.openingHook}&rdquo;</span>`.
  - Lines 82-88: 3 Horizontal Triad Talking Points rendered in 2nd row: `<div className="grid grid-cols-1 md:grid-cols-3 gap-2">`.

- **MasterGuiderHud Component**:
  - File: `src/features/coaching/components/master-guider-hud.tsx`
  - Lines 37-55: Pacing status thresholds:
    - Optimal Cadence (130-150 WPM)
    - Deliberate Pace (<110 WPM)
    - Fast Pace (>170 WPM)
  - Lines 110-123: Primary action button: `Ask Coach for Advice` with icon `<Sparkles className="size-3.5" />`.
  - Lines 126-138: Secondary action button: `Coach Rescue: Model Pitch Script` with click handler `onCoachRescue`.
  - Lines 84-94: Speech bubble rendering `coachSpeechBubble` for live spoken advice.

- **Coaching Room Component**:
  - File: `src/features/coaching/components/coaching-room.tsx`
  - Line 18: `export function CoachingRoom({ sessionId }: { sessionId: string })`
  - Lines 174-200: `handleAskCoachAdvice` calculates WPM tip based on `wpm` thresholds, sets `coachSpeechBubble`, and invokes TTS audio via `generateTTS` and `playAudioData`.
  - Lines 202-219: `handlePlayRescueAudio` triggers TTS playback of model pitch script (`rescueScript`).

- **Voice & TTS Infrastructure**:
  - File: `src/lib/voice-engine.ts`
  - Lines 30-49: `generateTTS` makes POST request to `/api/tts` with text and Cartesia voice ID.
  - Lines 156-283: `createSTT` combines Web Speech API (`SpeechRecognition`) for live visual feedback and `MediaRecorder` for Groq Whisper (`/api/transcribe`).

- **Existing Unit Tests**:
  - `src/features/coaching/components/master-guider-hud.test.tsx` (1 test)
  - `src/features/coaching/components/coaching-setup.test.tsx` (1 test)
  - `src/features/simulator/StageCaption.test.tsx` (7 tests)
  - `src/features/simulator/AudiencePanel.test.tsx` (6 tests)
  - `src/features/simulator/TranscriptPanel.test.tsx` (3 tests)
  - `src/features/simulator/SlideStage.test.tsx` (3 tests)
  - `src/features/simulator/TopicStage.test.tsx` (2 tests)
  - `src/features/simulator/SessionTimer.test.tsx` (3 tests)
  - `src/features/simulator/CameraPip.test.tsx` (2 tests)

---

## 2. Logic Chain

1. **Observation**: `CoachingTeleprompter` (`coaching-teleprompter.tsx`) uses a 2-row layout with an Opening Hook (0-15s) in row 1 and a 3-column grid for talking points (Context, Solution, Impact) in row 2.
   **Reasoning**: This layout matches the exact design specification for Requirement R3's teleprompter.

2. **Observation**: `MasterGuiderHud` (`master-guider-hud.tsx`) renders the WPM tempo gauge with ranges for Optimal Cadence (130-150 WPM), Deliberate Pace (<110 WPM), and Fast Pace (>170 WPM), along with two action buttons: `Ask Coach for Advice` (primary) and `Coach Rescue: Model Pitch Script` (secondary).
   **Reasoning**: The HUD components, state bindings, and handlers in `coaching-room.tsx` fully realize Requirement R3's live speech telemetry and coach interaction requirements.

3. **Observation**: `npm test` runs 103 test files with 439 passing tests using Vitest in a `node` environment, where React components are tested using `renderToString` from `react-dom/server`.
   **Reasoning**: Unit tests for new components or updates to `CoachingTeleprompter`, `CoachingRoom`, or `SimulatorRoom` should follow this established pattern (`renderToString` + string assertion or Vitest DOM matchers).

---

## 3. Caveats

- **Web Speech API Browser Compatibility**: `SpeechRecognition` relies on browser support (`window.SpeechRecognition` || `window.webkitSpeechRecognition`). In environments without browser Web Speech API (e.g. Node/jsdom unit test environments), speech recognition must be mocked or gracefully handled by fallbacks.
- **Cartesia TTS API Keys**: Real voice generation requires an active Cartesia API key configured in server environment variables. When missing, `generateTTS` falls back to error handling, and `CoachingRoom` shows speech advice in the HUD text bubble.

---

## 4. Conclusion

Requirement R3's components (2-row teleprompter, live WPM meter with 130-150 WPM optimal cadence, "Ask Coach for Live Advice" primary action, and "Coach Rescue: Model Pitch Script" secondary action) are already cleanly structured and implemented in `coaching-teleprompter.tsx`, `master-guider-hud.tsx`, `coaching-room.tsx`, and `voice-engine.ts`. 

The test infrastructure is fully functional (`npm test` passes 103 test files / 439 tests). Implementation workers can build additional unit test coverage for `coaching-teleprompter.tsx`, `coaching-room.tsx`, and `SimulatorRoom.tsx` following the existing `renderToString` pattern in `master-guider-hud.test.tsx`.

---

## 5. Verification Method

To verify these findings independently:

1. Run unit tests command:
   ```bash
   npm test
   ```
   Confirm that all 103 test files pass without error.

2. Inspect the teleprompter component:
   - View `src/features/coaching/components/coaching-teleprompter.tsx` lines 76-89 to verify the 2-row layout (Hook + 3 Triad Points).

3. Inspect the HUD & Pitch Rescue components:
   - View `src/features/coaching/components/master-guider-hud.tsx` lines 37-55 for WPM ranges and lines 110-138 for Primary/Secondary actions.
   - View `src/features/coaching/components/coach-rescue-modal.tsx` for modal implementation.

4. Inspect test file implementation pattern:
   - View `src/features/coaching/components/master-guider-hud.test.tsx` for the `renderToString` Vitest setup.
