## 2026-07-27T00:08:11Z
Implement Milestone 4 (Dynamic Slide Palette Ambient Lighting) and Milestone 5 (SimulatorRoom & Header Status Bar Integration) for Presentation Sparring Partner.

Scope of changes:
1. Extended CSS in `src/app/globals.css`:
   - Extend `.ambient-glow` to support custom `--ambient-glow-color`.
   - Add presenter state utility classes (`.ambient-glow-idle`, `.ambient-glow-user`, `.ambient-glow-panel`) with keyframe pulse animations (`ambient-pulse`, `ambient-pulse-fast`).
   - Configure light mode and dark mode opacities and blur radii adhering to design system tokens.
2. Slide Palette Module `src/features/simulator/slide-palette.ts`:
   - Export `PresenterLightingState` ('idle' | 'listening' | 'speaking' | 'examiner_speaking').
   - Export `derivePresenterState({ micActive, hearing, speakingPersonaId })`.
   - Export `SlidePalette` interface and `PALETTE_PRESETS` array (5 presets with distinct primary/secondary/accent color themes).
   - Export `getSlidePalette(slideIndex: number, customPalette?: Partial<SlidePalette>): SlidePalette`.
3. Dynamic Ambient Lighting Component `src/features/simulator/SlideAmbientLighting.tsx`:
   - Accept `slideIndex`, `palette`, `state`, `className`.
   - Render hardware-accelerated radial backdrop glow with `--ambient-glow-color` and presenter state modifiers.
4. Simulator Header Component `src/features/simulator/SimulatorHeader.tsx`:
   - Create studio glassmorphism header (`glass-header`, `backdrop-blur-md`, `border-border/40`).
   - Integrate `AudioVisualizer`:
     - Presenter mic input visualizer (`type="input"`, `isActive={micActive && hearing}`, `barCount={4}`).
     - Cartesia TTS examiner voice visualizer (`type="output"`, `isActive={speakingPersonaId !== null}`, `barCount={4}`).
   - Display exit action link, deck title/topic, recording indicator badge, and slide counter.
5. Integration in `src/features/simulator/SimulatorRoom.tsx` & `SlideStage.tsx`:
   - Refactor `SimulatorRoom.tsx` to use `<SimulatorHeader>` and place `<SlideAmbientLighting>` behind `<SlideStage>` at the room container level.
   - Update `SlideStage.tsx` with `shadow-e2` (do NOT add internal absolute elements to preserve `SlideStage.test.tsx`).
6. Unit Tests:
   - Create `src/features/simulator/__tests__/slide-palette.test.ts`
   - Create `src/features/simulator/__tests__/SlideAmbientLighting.test.tsx`
   - Create `src/features/simulator/__tests__/SimulatorHeader.test.tsx`
   - Create `src/features/simulator/__tests__/SimulatorRoom.test.tsx` (or update existing test files).
7. Verification:
   - Run `npx tsc --noEmit`
   - Run `npm run lint`
   - Run `npm test`
   - Run `npm run build`
