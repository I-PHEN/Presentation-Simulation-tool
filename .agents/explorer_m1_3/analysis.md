# Audio Handling & Codebase Analysis Report

## Overview
This report documents the detailed investigation into audio stream handling, Web Audio API / AudioContext hooks, Cartesia TTS synthesis, presenter microphone capture, visualizer component interfaces, and repo build/test infrastructure for the **Presentation Sparring Partner** repository.

---

## 1. Presenter Microphone Input Handling

### Current Implementation & Code Flow
Presenter microphone capture is handled primarily across three files:
1. **`src/lib/voice-engine.ts` (`createSTT`)**:
   - Line 168: Acquires audio stream via `navigator.mediaDevices.getUserMedia({ audio: true })`.
   - Line 171: Instantiates a `MediaRecorder` (`mimeType: 'audio/webm'`, `audioBitsPerSecond: 32_000`) for chunking microphone audio to send to Groq Whisper (`/api/transcribe`) upon stopping.
   - Line 178-197: Initializes browser `SpeechRecognition` (Web Speech API) for live interim visual feedback in the UI while recording.
   - Stream Scope: Held in closure scope variable `stream`. When recording stops, track cleanup is executed via `stream.getTracks().forEach(track => track.stop())`.

2. **`src/features/simulator/browser-audio-recorder.ts` (`acquireBrowserRecorder`)**:
   - Line 9: Acquires continuous microphone audio via `navigator.mediaDevices.getUserMedia({ audio: true })`.
   - Line 10: Creates a `MediaRecorder` instance to collect audio webm blobs for full-session recording upload.
   - Stream Scope: Held in closure scope variable `stream`, released via `.release()`.

3. **`src/components/configure-section.tsx` (Microphone Test & Web Audio API Example)**:
   - Line 177: Calls `navigator.mediaDevices.getUserMedia({ audio: true })`.
   - Lines 180-190: Creates an `AudioContext` (`new (window.AudioContext || window.webkitAudioContext)()`), initializes an `AnalyserNode` (`fftSize = 64`), and taps the microphone stream using `audioContext.createMediaStreamSource(stream)`.
   - Lines 196-217: Uses `requestAnimationFrame` and `analyser.getByteFrequencyData(dataArray)` to compute 16 frequency bands and volume level for real-time UI meter display.
   - Lines 228-246: Handles cleanup by cancelling animation frame, stopping MediaStream tracks, and closing AudioContext.

4. **`src/features/simulator/use-simulation-engine.ts`**:
   - Lines 57-71 (`startCapture`): Calls `createSTT`, setting `captureState = 'listening'`.
   - Lines 50-55 (`stopCapture`): Stops capture and awaits pending transcript commits.
   - Lines 73-78 (`pauseCapture`/`resumeCapture`): Controls microphone recording state during examiner speaking turns.

### Tapping Point for Input Audio Visualization
- **Current State**: Neither `createSTT` nor `acquireBrowserRecorder` exposes the active `MediaStream` or an `AudioNode` to React component state.
- **Accessibility / Integration Point**:
  - In `useSimulationEngine.ts`, `captureRef` or state can store the active `MediaStream` (or an `AudioNode` / `AnalyserNode` created from `AudioContext.createMediaStreamSource(stream)`).
  - Alternatively, a custom React hook (e.g. `useAudioAnalyser(stream)`) can take `stream: MediaStream | null` and yield frequency data arrays or an `AnalyserNode` to pass to `<AudioVisualizer stream={micStream} type="input" />`.

---

## 2. Cartesia TTS Output Playback

### Current Implementation & Code Flow
Cartesia Text-to-Speech synthesis and audio output playback are structured as follows:

1. **Server API Route (`src/app/api/tts/route.ts`)**:
   - Lines 5-7: Initializes `@cartesia/cartesia-js` client using `process.env.CARTESIA_API_KEY`.
   - Lines 38-50: Calls `cartesia.tts.generate({ model_id: 'sonic-3.5', transcript: text, voice: { mode: 'id', id: voiceId }, output_format: { container: 'mp3', sample_rate: 44100, bit_rate: 128000 } })`.
   - Line 54-58: Returns binary `audioBlob` with `Content-Type: audio/mpeg`.

2. **Client Voice Engine (`src/lib/voice-engine.ts`)**:
   - Lines 30-49 (`generateTTS`): Sends POST request to `/api/tts` with `{ text, voiceId }` and returns `{ audio: Blob }`.
   - Lines 66-74 (`unlockAudio`): Instantiates a temporary `AudioContext` and calls `ctx.resume()` on user interaction to unlock browser autoplay policy.
   - Lines 84-137 (`playAudioData`):
     - Line 100-101: Creates object URL `URL.createObjectURL(blob)` and instantiates HTMLAudioElement `audio = new Audio(url)`.
     - Line 104-105: Sets `activeAudioElement = audio` and `activePlayback = { audio, url, finish }`.
     - Line 107-110: On `onloadedmetadata`, passes audio duration in ms to `onDuration` callback.
     - Line 121: Executes `audio.play()`.

3. **Panel Voice Controller (`src/features/simulator/panel-voice.ts`)**:
   - Lines 115-138 (`speak`) & Lines 140-156 (`speakIntro`): Pauses presenter mic capture, generates speech via `generateTTS`, plays speech via `playSpeech` (`playAudioData`), and paces line caption reveal using audio duration callback `repaceToAudio`.

### Tapping Point for Output Audio Visualization
- **Current State**: `playAudioData` uses standard `HTMLAudioElement` (`new Audio(url)`), without attaching a Web Audio `AnalyserNode`.
- **Accessibility / Integration Point**:
  - `activeAudioElement` in `src/lib/voice-engine.ts` holds the active `HTMLAudioElement`.
  - An `AudioContext` can create a `MediaElementAudioSourceNode` via `audioContext.createMediaElementSource(audioElement)` and connect it to an `AnalyserNode` and `audioContext.destination`.
  - Alternatively, `playAudioData` or `usePanelVoice` can expose the active `AudioNode` or `HTMLAudioElement` to allow `<AudioVisualizer audioNode={outputNode} type="output" />` to derive live frequency bands.

---

## 3. Web Audio API / AudioContext Hooks & Visualizer Components

### Existing Audio Hooks & Components
1. **`src/components/audio-visualizer.tsx`**:
   - Lines 5-10: Accepts props `{ isActive?: boolean; variant?: 'mic' | 'speaker'; barCount?: number; className?: string }`.
   - Lines 23-49: Renders CSS-animated equalizer bars (`sp-eq` keyframes). Currently driven solely by `isActive` boolean (dummy fallback animation).
   - **Contract Target (`PROJECT.md`)**: Needs to support `stream?: MediaStream`, `audioNode?: AudioNode`, `isActive?: boolean`, `type: 'input' | 'output'`, `className?: string`.

2. **`src/features/simulator/ActivityBars.tsx`**:
   - Lines 11-28: Renders 4 CSS-animated bars (`sp-eq` keyframes) driven by `active: boolean` state.
   - Used in `AudiencePanel.tsx` (Lines 42 & 63) and `SimulatorToolbar.tsx` (Line 50) for speaking/listening status indicators.

3. **`src/features/simulator/SessionAudioPlayer.tsx`**:
   - Rendered in post-rehearsal report to play recorded session webm audio from `/recordings/[id].webm`.

---

## 4. Build, Test, and Lint Commands

### Repository Infrastructure Configuration
- **Package Manager**: NPM / Bun (repo includes `package-lock.json` and `bun.lock`).
- **Framework**: Next.js 16 (App Router), React 19, Tailwind CSS v4.
- **Testing Framework**: Vitest 4 (`vitest.config.ts`).
- **Linter**: ESLint 9 (`eslint.config.mjs`).

### Command Summary & Execution Results

| Action | Exact Command | Execution Status / Details |
|---|---|---|
| **Build Project** | `npm run build` *(or `bun run build`)* | Next.js production build + standalone output packaging |
| **Run Unit Tests** | `npm test` *(or `npx vitest run` / `bun run test`)* | Executed 96 test files (417 tests total). **94 passed (415 tests)**, 2 failed due to bar count assertion mismatches in `ActivityBars.test.tsx` and `AudiencePanel.test.tsx` (expecting 3 bars while component renders 4). |
| **Run Linter** | `npm run lint` *(or `npx eslint .`)* | Executes ESLint 9 analysis. Detects strict React 19 hook lint errors (`react-hooks/refs` in `use-simulation-engine.ts` and `react-hooks/set-state-in-effect` in auth/asset hooks). |
| **Type Check** | `npx tsc --noEmit` | Validates TypeScript compilation across `src/`. |
| **Database Sync** | `npm run db:generate` | Generates Prisma Client types for `@prisma/client`. |


---

## 5. File Map of Audio-Related Source Code

| File Path | Role & Audio Responsibility | Key Functions / Nodes |
|---|---|---|
| `src/lib/voice-engine.ts` | TTS API fetch, HTMLAudioElement playback, Web Speech API + Groq STT | `generateTTS`, `playAudioData`, `unlockAudio`, `createSTT` |
| `src/app/api/tts/route.ts` | Cartesia TTS backend integration (Sonic 3.5 MP3) | `POST` handler |
| `src/features/simulator/browser-audio-recorder.ts` | Full-session microphone stream capture and WebM recorder | `acquireBrowserRecorder` |
| `src/features/simulator/panel-voice.ts` | Examiner persona TTS synthesis orchestration & caption pacing | `createPanelVoiceController`, `speak`, `speakIntro` |
| `src/features/simulator/use-simulation-engine.ts` | Main simulator hook connecting mic STT, panel voice TTS, session recorder | `useSimulationEngine`, `startCapture`, `begin`, `toggleMic` |
| `src/components/configure-section.tsx` | Web Audio API reference implementation for mic frequency analysis | `startMicTest`, `AudioContext`, `AnalyserNode` |
| `src/components/audio-visualizer.tsx` | Equalizer UI visualizer component | `AudioVisualizer` |
| `src/features/simulator/ActivityBars.tsx` | Equalizer status indicator component | `ActivityBars` |
| `src/features/simulator/SimulatorRoom.tsx` | Parent room layout containing toolbar, stage, audience panel | `SimulatorRoom` |
