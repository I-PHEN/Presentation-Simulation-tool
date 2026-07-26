# Handoff Report — Explorer 1 (Milestone 1: Exploration & Codebase Analysis)

## 1. Observation
- **Codebase Scope & Entry Point**:
  - Rehearsal session route: `src/app/rehearse/[sessionId]/page.tsx` (lines 5-55) fetches session context from `/api/session/${sessionId}` and renders `<SimulatorRoom session={session} onComplete={...} />`.
- **Simulator Core Component**:
  - `src/features/simulator/SimulatorRoom.tsx` (170 lines): Top-level component controlling layout, screen maximization, keybindings (`F` for maximize, arrow keys for slide navigation), header status bar, stage container, aside sidebars, toolbar, and modal backdrops.
- **Stage & Display Components**:
  - `SlideStage.tsx` (`src/features/simulator/SlideStage.tsx`, lines 12-25): Renders slide image inside `h-full w-fit` frame with mono position badge (`01 / 10`).
  - `TopicStage.tsx` (`src/features/simulator/TopicStage.tsx`, lines 14-31): Renders topic prompt heading (`h1.font-display`) and `ANGLE_PROMPTS` list for text rehearsals.
  - `StageCaption.tsx` (`src/features/simulator/StageCaption.tsx`, lines 14-70): Displays panel streaming caption text or idle slide text. Floats as a subtitle overlay (`overlay={true}`) when maximized.
- **Sidebars & Header**:
  - Header: Inlined `<header>` inside `SimulatorRoom.tsx` (lines 90-96), displaying exit link, session source title, and slide position status.
  - `AudiencePanel.tsx` (`src/features/simulator/AudiencePanel.tsx`, lines 23-71): Displays presenter ("You") mic status row and 3 AI panel personas (`panel.map`) with initial avatars, titles, focus areas, and `ActivityBars`.
  - `TranscriptPanel.tsx` (`src/features/simulator/TranscriptPanel.tsx`, lines 16-47): Displays WPM and Filler chips header, and scrollable `<ol>` list of transcript segments.
- **Floating Controls & Visual Indicators**:
  - `SimulatorToolbar.tsx` (`src/features/simulator/SimulatorToolbar.tsx`, lines 9-75): Floating pill toolbar containing slide navigation arrows, `SessionTimer`, recording badge, mic toggle, camera toggle, panel toggles, maximize toggle, and end rehearsal button.
  - `CameraPip.tsx` (`src/features/simulator/CameraPip.tsx`, lines 13-74): Draggable 16:9 mirrored self-view video box (`208x117px`) clamped to stage bounds via `pip-position.ts`.
  - `SessionTimer.tsx` (`src/features/simulator/SessionTimer.tsx`, lines 21-54): Clock button displaying formatted timestamp and clickable target cycling.
  - `ActivityBars.tsx` (`src/features/simulator/ActivityBars.tsx`, lines 11-28): 4-bar equalizer indicator animated during active presenter or examiner speech.
- **State Management & Audio Flow**:
  - `useSimulationEngine.ts` (`src/features/simulator/use-simulation-engine.ts`, lines 22-176): Hooks into `createSimulationController` and `createPanelVoiceController`. Manages STT mic capture (`createSTT`), TTS speech output (`generateTTS`, `playAudioData`), slide navigation, phase transitions (`ready`, `introducing`, `live`, `ended`), and session persistence via `PATCH /api/session/[id]`.
  - Speech & Mic coordination: `panel-voice.ts` pauses presenter microphone (`pauseCapture`) when examiner TTS begins, and resumes microphone (`resumeCapture`) when TTS ends.
- **Styling & CSS Tokens**:
  - `src/app/globals.css` (205 lines): Defines theme CSS variables (`--primary`, `--background`, `--card`, etc.), `.glass-panel`, `.glass-card`, `.ambient-glow`, and `@keyframes sp-eq`.
- **Unit Test Execution Results**:
  - Command: `npx vitest run src/features/simulator`
  - Output: 21 test files, 98 tests total (96 passed, 2 failed).
  - Failed tests: `ActivityBars.test.tsx` and `AudiencePanel.test.tsx` both failed on bar count assertion (`expected 3 animated bars, got 4`).
  - Root cause: `ActivityBars.tsx` line 14 renders 4 bars (`{[0, 1, 2, 3]}`), while the component comment and tests specify 3 bars (`toHaveLength(3)`). This discrepancy will be addressed during Milestone 3 when replacing/upgrading `ActivityBars.tsx` with the multi-band audio visualizer.

---

## 2. Logic Chain
1. **Observation**: `RehearseRoomPage` (`src/app/rehearse/[sessionId]/page.tsx`) passes `session` to `SimulatorRoom`.
2. **Observation**: `SimulatorRoom` initializes `useSimulationEngine(session, { onComplete })`.
3. **Reasoning**: `useSimulationEngine` orchestrates the complete lifecycle: slide position state, microphone capture (STT), AI panel turn selection (`turn-selection.ts`), Cartesia TTS generation, live caption streaming (`panel-voice.ts`), and metric computation (`metrics.ts`).
4. **Observation**: Visual components (`SlideStage`, `TopicStage`, `StageCaption`, `AudiencePanel`, `TranscriptPanel`, `SimulatorToolbar`, `CameraPip`) receive pure props derived from `useSimulationEngine`.
5. **Reasoning**: The component hierarchy cleanly separates presentation UI components from state machine logic.
6. **Conclusion**: Subsequent milestones (M2 glassmorphism tokens, M3 multi-band audio visualizer, M4 dynamic slide palette backlight) can be integrated cleanly into `globals.css`, `SimulatorToolbar`, `AudiencePanel`, `StageCaption`, and `SimulatorRoom` without disrupting core simulation logic.

---

## 3. Caveats
- **Hardware Dependencies**: Real camera capture (`useCamera`) and Web Speech API STT / Cartesia TTS require browser audio/video permissions and API keys in production; unit tests use mock functions and static DOM rendering.
- **CODE_ONLY Network Mode**: External network access is restricted during exploration; investigation was conducted entirely via local file system tools.
- **Pre-existing Test Mismatch**: 2 out of 98 unit tests in `src/features/simulator` fail due to a 4-bar vs 3-bar mismatch between `ActivityBars.tsx` (`{[0, 1, 2, 3]}`) and `ActivityBars.test.tsx` / `AudiencePanel.test.tsx` (`toHaveLength(3)`).

---

## 4. Conclusion
The codebase for presentation simulation is well-structured, modular, and extensively covered by unit tests (96/98 tests passing). All target components (`SimulatorRoom`, header status bar, `SlideStage`, `TopicStage`, `StageCaption`, `AudiencePanel`, `TranscriptPanel`, `SimulatorToolbar`, `CameraPip`, `SessionTimer`, `ActivityBars`, `useSimulationEngine`) have been analyzed, mapped, and documented in `analysis.md`. The project is ready for Milestone 2 (Studio Glassmorphism Tokens & CSS).

---

## 5. Verification Method
To independently verify the codebase and components documented in this analysis report:

1. **Run Unit Tests for Simulator Components**:
   ```bash
   npx vitest run src/features/simulator
   ```
   *Expected result*: 96/98 tests passing (2 failures in `ActivityBars.test.tsx` and `AudiencePanel.test.tsx` due to known 4-bar vs 3-bar length assertion).
2. **Inspect Component Files**:
   - `src/features/simulator/SimulatorRoom.tsx`
   - `src/features/simulator/SlideStage.tsx`
   - `src/features/simulator/TopicStage.tsx`
   - `src/features/simulator/StageCaption.tsx`
   - `src/features/simulator/AudiencePanel.tsx`
   - `src/features/simulator/TranscriptPanel.tsx`
   - `src/features/simulator/SimulatorToolbar.tsx`
   - `src/features/simulator/use-simulation-engine.ts`
   - `src/app/globals.css`
3. **Invalidation Conditions**:
   - If any component file path changes or is removed.
   - If test results deviate from 96 passing / 2 failing tests on bar count.
