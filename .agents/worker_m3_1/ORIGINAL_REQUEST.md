## 2026-07-27T00:00:21Z
You are Worker 1 for Milestone 3 (Glowing Multi-Band Audio Visualizers) of the Presentation Sparring Partner enhancement project.
Working directory: c:/Users/Michael/Downloads/sparring-partner/.agents/worker_m3_1
Scope document: c:/Users/Michael/Downloads/sparring-partner/.agents/orchestrator/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
1. Create/enhance glowing multi-band audio visualizers for presenter microphone input and Cartesia TTS speech output in `src/components/audio-visualizer.tsx` and `src/features/simulator/ActivityBars.tsx`.
2. Adhere to the `PROJECT.md` interface contract:
   - `stream?: MediaStream`
   - `audioNode?: AudioNode`
   - `isActive?: boolean`
   - `type: 'input' | 'output'`
   - `className?: string`
3. Implement Web Audio API frequency analysis hook or logic (`AudioContext`, `AnalyserNode`, `getByteFrequencyData()`) to drive multi-band frequency bars dynamically when active audio streams/nodes are present, with smooth fallback glow animations when active.
4. Style multi-band visualizers with glowing multi-frequency bars:
   - `input` (mic): vibrant microphone glow (emerald/cyan design tokens).
   - `output` (Cartesia TTS): distinct Cartesia voice speaking glow (violet/indigo/primary design tokens).
5. Ensure zero regressions in existing tests (`ActivityBars.test.tsx`, `AudiencePanel.test.tsx`, `AudioVisualizer.test.tsx`).
6. Run and verify all quality gates:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm test`
   - `npm run build`
7. Write changes and handoff to `c:/Users/Michael/Downloads/sparring-partner/.agents/worker_m3_1/changes.md` and `handoff.md`.
8. Send a completion message to the parent orchestrator with build/test results.
