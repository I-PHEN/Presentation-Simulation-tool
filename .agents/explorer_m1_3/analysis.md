# Comprehensive Analysis: Teleprompter, WPM Meter, Pitch Rescue & Test Setup

## Executive Summary
This report presents a thorough analysis of the existing codebase for **Sparring Partner** (Thesis Defense & Presentation Simulator), focusing on teleprompter components, speech/WPM telemetry, coach rescue features, and unit testing infrastructure. 

Key Findings:
1. **Existing Teleprompter & HUD**: `CoachingTeleprompter` (`coaching-teleprompter.tsx`) and `MasterGuiderHud` (`master-guider-hud.tsx`) already implement key R3 elements, including a 2-row layout (Opening Hook + 3 Triad Points) and WPM cadence status ranges.
2. **Speech & TTS Infrastructure**: Web Speech API (`SpeechRecognition`) and Groq Whisper (`/api/transcribe`) handle live/committed speech recognition, while Cartesia TTS (`/api/tts` & `voice-engine.ts`) handles voice playback for Coach Sarah and Coach Marcus.
3. **Unit Test Suite**: 103 test files containing 439 tests are active and 100% passing via `vitest run` (`npm test`). Component testing uses `renderToString` from `react-dom/server` in Vitest's `node` environment.

---

## 1. Existing Codebase Architecture

### 1.1 CoachingRoom & Feature Structure
- **Path**: `src/features/coaching/components/coaching-room.tsx`
- **Page Wrapper**: `src/app/coaching/[sessionId]/page.tsx`
- **Component Layout**:
  - **Left Column**:
    - `CoachingHeader` (`coaching-header.tsx`) — Back button, session title, mode badge.
    - `CoachingSlideViewer` (`coaching-slide-viewer.tsx`) — Slide stage with image/text rendering & navigation.
    - `CoachingTeleprompter` (`coaching-teleprompter.tsx`) — 2-row spoken delivery guide.
    - `CoachingControls` (`coaching-controls.tsx`) — Mic toggle, recording toggle, finish session button.
  - **Right Column**:
    - `MasterGuiderHud` (`master-guider-hud.tsx`) — Coach persona badge, speech bubble, live WPM gauge, primary action ("Ask Coach for Live Advice"), secondary action ("Coach Rescue: Model Pitch Script").
  - **Modals**:
    - `CoachRescueModal` (`coach-rescue-modal.tsx`) — Dialog with full pitch script & audio TTS button.

### 1.2 Teleprompter Architecture
- **File**: `src/features/coaching/components/coaching-teleprompter.tsx`
- **Props**: `currentSlide`, `script`, `isLoading`, `isPlayingDemo`, `onPlayDemo`, `isTopicSession`.
- **Data Source**: Fetched asynchronously from `/api/coaching/script` (`src/app/api/coaching/script/route.ts`).
- **Data Structure (`SlideScriptData`)**:
  ```ts
  export interface SlideScriptData {
    openingHook: string;
    talkingPoints: string[];
    rescueScript: string;
  }
  ```
- **2-Row Visual Layout**:
  - **Row 1**: Opening Hook badge container with `Sparkles` icon:
    `Hook (0-15s): "{activeScript.openingHook}"`
  - **Row 2**: 3 Horizontal Triad Talking Points in a 3-column grid (`grid grid-cols-1 md:grid-cols-3 gap-2`):
    - Context point (1)
    - Solution point (2)
    - Impact point (3)

### 1.3 Speech Analysis, WPM Measurement & Cadence Gauge
- **Files**:
  - `src/lib/voice-engine.ts` (`createSTT`, `generateTTS`, `playAudioData`)
  - `src/components/present-section.tsx` (`calcWPM`: `Math.round((words / elapsedSec) * 60)`)
  - `src/features/simulator/metrics.ts`
  - `src/features/coaching/components/master-guider-hud.tsx`
- **Mechanics**:
  - `createSTT` sets up continuous Web Speech API (`SpeechRecognition`) for instant real-time text updates (`onUpdate`) and `MediaRecorder` for final transcript processing via Groq Whisper (`/api/transcribe`).
  - `MasterGuiderHud` renders live speech tempo and cadence indicator:
    - **Optimal Cadence (130-150 WPM)**: Styled with `text-emerald-400` / `bg-emerald-500/10 border-emerald-500/30`.
    - **Deliberate Pace (<110 WPM)**: Styled with `text-sky-400` / `bg-sky-500/10 border-sky-500/30`.
    - **Fast Pace (>170 WPM)**: Styled with `text-amber-400` / `bg-amber-500/10 border-amber-500/30`.

### 1.4 Pitch Rescue & Coach Advice
- **Files**:
  - `src/features/coaching/components/coach-rescue-modal.tsx`
  - `src/features/coaching/components/master-guider-hud.tsx`
- **Primary Action — "🎙️ Ask Coach for Live Advice"**:
  - Invoked via `onAskCoachAdvice` in `MasterGuiderHud`.
  - Function `handleAskCoachAdvice` in `coaching-room.tsx` evaluates current live WPM and transcript.
  - Synthesizes coach tip (e.g., rushed pace vs. deliberate pace vs. strong flow).
  - Updates `coachSpeechBubble` state in HUD and triggers Cartesia TTS voice readout (`generateTTS` + `playAudioData`) using coach voice ID (Sarah: `a7a59115...`, Marcus: `533b2990...`).
- **Secondary Action — "✨ Coach Rescue: Model Pitch Script"**:
  - Invoked via `onCoachRescue` in `MasterGuiderHud`.
  - Opens `CoachRescueModal` (`coach-rescue-modal.tsx`) containing verbatim model pitch script (`rescueScript`).
  - Allows presenter to listen to full script read aloud by AI Coach.

---

## 2. Requirement R3 Implementation Blueprint

Requirement R3 specifies:
1. **2-Row Delivery Guide Teleprompter**: Opening Hook (0-15s) + 3 Horizontal Triad Talking Points (Context, Solution, Impact).
2. **Live Speech WPM Meter**: Real-time pace meter with optimal cadence indicator (130-150 WPM).
3. **Primary Action**: "🎙️ Ask Coach for Live Advice" (transcribes presenter's actual speech and speaks custom advice aloud).
4. **Secondary Action**: "✨ Coach Rescue: Model Pitch Script".

### 2.1 Component Specifications

| Requirement Component | Target File | Recommended Implementation Detail |
|---|---|---|
| **2-Row Teleprompter Layout** | `src/features/coaching/components/coaching-teleprompter.tsx` | Maintain `h-44 border-t bg-card/90` container. Ensure top row renders Opening Hook (0-15s) in full width card with primary accent border, and bottom row renders exact 3-item horizontal grid (`grid-cols-3`) for Context, Solution, Impact triad. |
| **Live WPM Meter & Cadence** | `src/features/coaching/components/master-guider-hud.tsx` | Ensure pacing status ranges map to 130–150 WPM as "Optimal Cadence", <110 WPM as "Deliberate Pace", and >170 WPM as "Fast Pace". Connect live transcript stream length to `calcWPM` in `coaching-room.tsx`. |
| **Ask Coach Primary Action** | `src/features/coaching/components/master-guider-hud.tsx` | Full-width primary button with microphone icon (`🎙️ Ask Coach for Live Advice`). Clicking triggers speech synthesis & TTS audio playback. |
| **Coach Rescue Secondary Action** | `src/features/coaching/components/master-guider-hud.tsx` | Secondary outline button (`✨ Coach Rescue: Model Pitch Script`). Clicking opens `CoachRescueModal`. |

---

## 3. Unit Test Setup & Inventory

### 3.1 Test Framework Configuration
- **Test Runner**: Vitest v4.1.10 (`npm test` executes `vitest run`).
- **Config File**: `vitest.config.ts`
  - Alias: `@` mapped to `./src`.
  - Environment: `node`.
  - Files pattern: `src/**/*.test.ts`, `src/**/*.test.tsx`.
- **Component Testing Approach**: React components are tested under `node` using `react-dom/server`'s `renderToString` or `renderToStaticMarkup`.

### 3.2 Test Suite Execution Results
- **Command**: `npm test`
- **Result**: 103 test files passed (103/103), 439 tests passed (439/439).
- **Execution Time**: ~58 seconds.

### 3.3 Complete Inventory of Relevant Test Files

#### Coaching Feature Test Files:
1. `src/features/coaching/components/master-guider-hud.test.tsx` (1 test)
   - Tests rendering of coach persona, slide index, WPM gauge, and rescue action button.
2. `src/features/coaching/components/coaching-setup.test.tsx` (1 test)
   - Tests rendering of intake steps, persona selection, and explanation depth controls.
3. `src/app/api/coaching/script/route.test.ts` (1 test)
   - Tests API endpoint generation of opening hook, talking points, and rescue script.
4. `src/features/coaching/progress-model.test.ts` (2 tests)
5. `src/features/coaching/session-outcome.test.ts` (8 tests)
6. `src/features/coaching/speaker-profile.test.ts` (11 tests)
7. `src/features/coaching/speaker-profile-repository.test.ts` (3 tests)
8. `src/features/coaching/prisma-schema.test.ts` (7 tests)

#### Simulator Feature Test Files:
1. `src/features/simulator/ActivityBars.test.tsx` (3 tests)
2. `src/features/simulator/AudiencePanel.test.tsx` (6 tests)
3. `src/features/simulator/CameraPip.test.tsx` (2 tests)
4. `src/features/simulator/SessionAudioPlayer.test.tsx` (3 tests)
5. `src/features/simulator/SessionTimer.test.tsx` (3 tests)
6. `src/features/simulator/SimulatorToolbar.test.tsx` (Tested via integration / component tests)
7. `src/features/simulator/SlideStage.test.tsx` (3 tests)
8. `src/features/simulator/StageCaption.test.tsx` (7 tests)
9. `src/features/simulator/TopicStage.test.tsx` (2 tests)
10. `src/features/simulator/TranscriptPanel.test.tsx` (3 tests)
11. `src/features/simulator/metrics.test.ts` (4 tests)
12. `src/features/simulator/simulation-controller.test.ts` (5 tests)
13. `src/features/simulator/session-recorder.test.ts` (8 tests)
14. `src/features/simulator/panel-voice.test.ts` (8 tests)
15. `src/features/simulator/turn-selection.test.ts` (5 tests)
16. `src/features/simulator/pip-position.test.ts` (6 tests)
17. `src/features/simulator/slide-keys.test.ts` (5 tests)
18. `src/features/simulator/intro.test.ts` (5 tests)
19. `src/features/simulator/__tests__/slide-palette.test.ts` (8 tests)

---

## 4. Worker Recommendations for Implementation Phase

1. **`coaching-teleprompter.tsx` Unit Test**:
   Create `src/features/coaching/components/coaching-teleprompter.test.tsx` using `renderToString`:
   - Assert presence of `Hook (0-15s)` header.
   - Assert rendering of 3 triad points (Context, Solution, Impact).
   - Assert loading spinner state when `isLoading` is true.

2. **`coaching-room.tsx` Unit Test**:
   Create `src/features/coaching/components/coaching-room.test.tsx`:
   - Mock `authenticatedFetch` for `/api/session/[id]` and `/api/coaching/script`.
   - Mock `useAppStore` for coach persona settings.
   - Verify layout mounting of `CoachingTeleprompter` and `MasterGuiderHud`.

3. **`SimulatorRoom.tsx` Unit Test**:
   Create `src/features/simulator/SimulatorRoom.test.tsx`:
   - Verify rendering of `SimulatorHeader`, `SlideStage` / `TopicStage`, `StageCaption`, and `SimulatorToolbar`.
