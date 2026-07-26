# Handoff Report — Explorer 3 (Milestone 1)

## 1. Observation
- **Presenter Microphone Capture**:
  - `src/lib/voice-engine.ts:168`: `stream = await navigator.mediaDevices.getUserMedia({ audio: true })`. Used inside `createSTT` for live speech recognition and Groq audio chunk recording.
  - `src/features/simulator/browser-audio-recorder.ts:9`: `stream = await navigator.mediaDevices.getUserMedia({ audio: true })`. Used inside `acquireBrowserRecorder` for full session recording.
  - `src/components/configure-section.tsx:177-190`: Uses `AudioContext`, `createMediaStreamSource(stream)`, and `AnalyserNode` (`fftSize = 64`) to compute 16 frequency bands and volume level for mic testing.

- **Cartesia TTS Output Playback**:
  - `src/app/api/tts/route.ts:38-54`: Server route calls `@cartesia/cartesia-js` (`sonic-3.5` model) and returns an `audio/mpeg` MP3 blob.
  - `src/lib/voice-engine.ts:30-48`: `generateTTS` posts to `/api/tts` and retrieves `audio: Blob`.
  - `src/lib/voice-engine.ts:84-137`: `playAudioData` creates `new Audio(URL.createObjectURL(blob))` (`HTMLAudioElement`) and plays audio. Exposes `activeAudioElement` reference at line 104.
  - `src/features/simulator/panel-voice.ts:115-156`: `speak` and `speakIntro` orchestrate TTS generation and audio playback while pacing caption text reveal.

- **Audio Visualizers & Web Audio API**:
  - `src/components/audio-visualizer.tsx`: Interface takes `{ isActive?: boolean; variant?: 'mic' | 'speaker'; barCount?: number; className?: string }`. Renders CSS-animated equalizer bars (`sp-eq`).
  - `src/features/simulator/ActivityBars.tsx`: Renders 4 CSS-animated bars based on `active: boolean`.
  - Interface contract in `PROJECT.md:19-20`: Requires `stream?: MediaStream`, `audioNode?: AudioNode`, `isActive?: boolean`, `type: 'input' | 'output'`, `className?: string`.

- **Repo Build and Test Configuration**:
  - `package.json:7`: `"build": "next build && node -e \"const fs = require('fs'); fs.mkdirSync('.next/standalone/.next', { recursive: true }); fs.cpSync('.next/static', '.next/standalone/.next/static', { recursive: true }); fs.cpSync('public', '.next/standalone/public', { recursive: true });\""`
  - `package.json:9`: `"test": "vitest run"`
  - `package.json:10`: `"lint": "eslint ."`
  - `vitest.config.ts:10-13`: `environment: 'node'`, `include: ['src/**/*.test.ts', 'src/**/*.test.tsx']`, path alias `'@'` -> `./src`.
  - `eslint.config.mjs:9-48`: Flat ESLint config with Next.js core web vitals and TypeScript rules.

---

## 2. Logic Chain
1. **Presenter Mic Flow**: Microphone access (`getUserMedia`) is executed inside `createSTT` and `acquireBrowserRecorder`. In both cases, the `MediaStream` object is scoped within closure functions and not exposed to React state or components. To connect real-time mic visualizers (`AudioVisualizer type="input"`), the `MediaStream` or an `AudioNode` / `AnalyserNode` derived from `audioContext.createMediaStreamSource(stream)` must be surfaced through `useSimulationEngine` or a custom hook.
2. **Cartesia Output Flow**: TTS audio is requested from `/api/tts` (Cartesia API route) and returned as an MP3 blob. `playAudioData` plays it via an HTML `HTMLAudioElement` (`new Audio(url)`). To visualize Cartesia output (`AudioVisualizer type="output"`), either `AudioContext.createMediaElementSource(audio)` must be connected to an `AnalyserNode`, or an `AudioBufferSourceNode` must be generated.
3. **Existing Visualizer Hooks**: `configure-section.tsx` provides a working reference for Web Audio API frequency analysis using `AudioContext`, `AnalyserNode`, and `getByteFrequencyData()`. This logic can be extracted into a reusable Web Audio API hook (e.g. `useAudioAnalyser`).
4. **Repo Build/Test Infrastructure**: Executing `npm run build` runs Next.js production build and standalone directory assembly. Executing `npm test` or `npx vitest run` runs unit tests via Vitest. Executing `npm run lint` or `npx eslint .` runs ESLint. Executing `npx tsc --noEmit` verifies TypeScript types.

---

## 3. Caveats
- Browser Autoplay Policy: `HTMLAudioElement.play()` or `AudioContext.resume()` requires a user interaction (gesture/click). `unlockAudio()` in `voice-engine.ts` already addresses this on initial click.
- `MediaElementAudioSourceNode` CORS & Re-connection constraints: Creating `createMediaElementSource(audioElement)` permanently connects that HTMLAudioElement to the specified `AudioContext`. If connected, `audioContext.destination` must be connected to maintain audible sound.

---

## 4. Conclusion
- All audio handling pathways (mic input, Cartesia TTS output, audio players, Web Audio API contexts) have been traced and cataloged with exact line numbers.
- Exact tapping points for Milestone 3 (Audio Visualizer Component) have been identified in `useSimulationEngine.ts`, `voice-engine.ts`, `panel-voice.ts`, and `configure-section.tsx`.
- All build, test, lint, and typecheck commands are verified and documented.

---

## 5. Verification Method
1. **Build Verification Command**: `npm run build` or `bun run build`
2. **Test Verification Command**: `npm test` or `npx vitest run` or `bun run test`
3. **Linter Verification Command**: `npm run lint` or `npx eslint .`
4. **Typecheck Verification Command**: `npx tsc --noEmit`
5. **Inspect Source Tapping Points**:
   - Mic Input: `src/lib/voice-engine.ts:168`, `src/features/simulator/browser-audio-recorder.ts:9`
   - Cartesia TTS Playback: `src/app/api/tts/route.ts:38`, `src/lib/voice-engine.ts:84`
   - Web Audio Frequency Analyser: `src/components/configure-section.tsx:180-217`
   - Visualizer Component & Props: `src/components/audio-visualizer.tsx:5-10`, `src/features/simulator/ActivityBars.tsx:11-28`
