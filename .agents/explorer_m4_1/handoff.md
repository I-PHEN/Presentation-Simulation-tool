# Handoff Report: Dynamic Slide Palette Ambient Lighting Investigation

## 1. Observation

### Codebase & Component Analysis
- **Slide Rendering Location**:
  - `src/features/simulator/SlideStage.tsx` (Lines 12–27): `SlideStage({ slide, position, total })` renders the active slide image using `<AuthenticatedSlideImage source={slide.imageUrl} alt={`Slide ${position + 1}: ${slide.text}`} className="h-full w-auto max-w-full object-contain" />` inside a rounded container `<div className="relative flex h-full w-fit min-w-0 max-w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card">`.
  - `src/features/simulator/SimulatorRoom.tsx` (Lines 107–117): `SimulatorRoom` mounts `SlideStage`:
    ```tsx
    {isTopic
      ? <TopicStage topic={session.deck.slides[0]?.text ?? ''} />
      : <SlideStage slide={engine.slide} position={position} total={total} />}
    ```
- **Active Slide Data & Indices Maintenance**:
  - `src/features/defense/types.ts` (Lines 24–33): `SlideContext` interface contains `{ index: number; text: string; imageUrl: string }`. `DeckContext` holds `slides: SlideContext[]`.
  - `src/features/simulator/use-simulation-engine.ts` (Lines 114–115 & 143): `position` is derived via `Math.max(0, session.deck.slides.findIndex((s) => s.index === state.slideIndex))` where `state.slideIndex` is managed inside `createSimulationController` (`src/features/simulator/simulation-controller.ts`).
  - Slide changes call `changeSlide(targetPos)` which invokes `controller.changeSlide(session.deck.slides[pos].index)`.
- **Presenter & Examiner State Tracking**:
  - `src/features/simulator/use-simulation-engine.ts` (Lines 27, 86–113, 166–171):
    - Mic state: `captureState` (`'idle' | 'listening' | 'paused'`), `micActive: captureState === 'listening'`.
    - User speech detection: `interim` string state (`hearing = engine.interim.trim().length > 0`).
    - Examiner state: `speakingPersonaId: voiceState.speakingPersonaId` (non-null when AI panel member speaks).
    - Phase tracking: `phase` (`'ready' | 'introducing' | 'live' | 'ended'`).
- **Current Ambient Glow Implementation**:
  - `src/features/simulator/SimulatorRoom.tsx` (Lines 107–114):
    ```tsx
    <div
      className={cn(
        'ambient-glow transition-all duration-700',
        engine.speakingPersonaId ? 'opacity-30 scale-105' : engine.micActive ? 'opacity-20' : 'opacity-10',
      )}
      aria-hidden="true"
    />
    ```
  - `src/app/globals.css` (Lines 186–200): `.ambient-glow` uses `radial-gradient(circle at 50% 50%, var(--primary), transparent 70%)` with static blur and opacity transitions.

### Test Execution Results
- Executed `npx vitest run src/features/simulator`:
  - **Result**: `21 passed (21 test files)`, `98 passed (98 tests)`.
- Executed `npm test` (`vitest run` across whole workspace):
  - **Result**: `97 passed (97 test files)`, `423 passed (423 tests)`.

---

## 2. Logic Chain

1. **Observation 1**: `SlideStage` receives `slide: SlideContext` (`{ index, text, imageUrl }`) and renders the image framed within `SimulatorRoom`. Currently, `SlideContext` lacks explicit color palette metadata, and the backdrop glow uses a static CSS `var(--primary)` color gradient regardless of slide content.
2. **Observation 2**: Presenter and examiner interaction states are already precisely tracked in `useSimulationEngine` via `micActive`, `interim` (user speaking), `speakingPersonaId` (examiner speaking), and simulation `phase`.
3. **Reasoning Step**: To create dynamic slide palette ambient lighting, we can map presenter state into a unified state representation (`idle` | `listening` | `speaking` | `examiner_speaking`) and pair it with a slide palette model (`primary`, `secondary`, `accent` colors or deterministic theme fallback).
4. **Design Synthesis**:
   - Introduce a dedicated module `src/features/simulator/slide-palette.ts` to compute or derive a slide color palette (using slide index / content or optional `palette` field on `SlideContext`).
   - Create a clean visual component `src/features/simulator/SlideAmbientLighting.tsx` (or integrate backdrop glow into `SlideStage`) that consumes `palette` and `presenterState`.
   - Update `SimulatorRoom` or `SlideStage` to pass active slide color cues and presenter state to `SlideAmbientLighting`, providing smooth CSS variable transitions (`--slide-glow-primary`, `--slide-glow-opacity`, `--slide-glow-scale`).

---

## 3. Caveats

- **Image Canvas Color Extraction**: Pure client-side canvas color extraction from slide image URLs (`imageUrl`) requires CORS or authenticated blob image canvas sampling. To ensure zero-latency slide rendering and avoid CORS canvas tainting, the proposed design includes deterministic fallback color palettes derived from slide index/hash alongside support for server-side or frontmatter-provided palette metadata.
- **Performance & Motion**: CSS filters (`filter: blur(...)`) and opacity scale transitions must be hardware-accelerated (`will-change: transform, opacity`) and respect `prefers-reduced-motion`.

---

## 4. Conclusion & Proposed Design

### Proposed Architecture

#### 1. Presenter State Definition & Mapping
Define `PresenterLightingState` in `src/features/simulator/slide-palette.ts`:
```ts
export type PresenterLightingState = 'idle' | 'listening' | 'speaking' | 'examiner_speaking';

export function derivePresenterState({
  micActive,
  hearing,
  speakingPersonaId,
}: {
  micActive: boolean;
  hearing: boolean;
  speakingPersonaId: string | null;
}): PresenterLightingState {
  if (speakingPersonaId !== null) return 'examiner_speaking';
  if (hearing) return 'speaking';
  if (micActive) return 'listening';
  return 'idle';
}
```

#### 2. Slide Palette Schema & Deterministic Fallback
```ts
export interface SlidePalette {
  primary: string; // e.g. "hsla(217, 91%, 60%, 1)"
  secondary: string; // e.g. "hsla(260, 83%, 65%, 1)"
  accent: string; // e.g. "hsla(180, 70%, 50%, 1)"
}

const PALETTE_PRESETS: SlidePalette[] = [
  { primary: 'rgba(59, 130, 246, 0.8)', secondary: 'rgba(99, 102, 241, 0.6)', accent: 'rgba(14, 165, 233, 0.4)' },  // Blue / Indigo
  { primary: 'rgba(20, 184, 166, 0.8)', secondary: 'rgba(16, 185, 129, 0.6)', accent: 'rgba(6, 182, 212, 0.4)' },   // Teal / Emerald
  { primary: 'rgba(168, 85, 247, 0.8)', secondary: 'rgba(236, 72, 153, 0.6)', accent: 'rgba(139, 92, 246, 0.4)' },  // Purple / Pink
  { primary: 'rgba(245, 158, 11, 0.8)', secondary: 'rgba(239, 68, 68, 0.6)', accent: 'rgba(251, 191, 36, 0.4)' },   // Amber / Warm
  { primary: 'rgba(99, 102, 241, 0.8)', secondary: 'rgba(147, 51, 234, 0.6)', accent: 'rgba(79, 70, 229, 0.4)' },   // Indigo / Violet
];

export function getSlidePalette(slideIndex: number, customPalette?: Partial<SlidePalette>): SlidePalette {
  if (customPalette?.primary) {
    return {
      primary: customPalette.primary,
      secondary: customPalette.secondary ?? customPalette.primary,
      accent: customPalette.accent ?? customPalette.primary,
    };
  }
  const index = Math.abs(slideIndex) % PALETTE_PRESETS.length;
  return PALETTE_PRESETS[index];
}
```

#### 3. Component Design: `SlideAmbientLighting.tsx`
Create `src/features/simulator/SlideAmbientLighting.tsx`:
```tsx
'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getSlidePalette, type PresenterLightingState, type SlidePalette } from './slide-palette';

export interface SlideAmbientLightingProps {
  slideIndex: number;
  palette?: Partial<SlidePalette>;
  state: PresenterLightingState;
  className?: string;
}

export function SlideAmbientLighting({ slideIndex, palette, state, className }: SlideAmbientLightingProps) {
  const activePalette = useMemo(() => getSlidePalette(slideIndex, palette), [slideIndex, palette]);

  const stateStyles = useMemo(() => {
    switch (state) {
      case 'speaking':
        return { opacity: 0.38, scale: 'scale-[1.04]', pulse: 'animate-pulse' };
      case 'examiner_speaking':
        return { opacity: 0.32, scale: 'scale-[1.05]', pulse: '' };
      case 'listening':
        return { opacity: 0.22, scale: 'scale-100', pulse: '' };
      case 'idle':
      default:
        return { opacity: 0.12, scale: 'scale-100', pulse: '' };
    }
  }, [state]);

  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl transition-all duration-700 ease-out', className)}
      style={{
        opacity: stateStyles.opacity,
      }}
    >
      {/* Primary Slide Palette Backdrop Glow */}
      <div
        className={cn('absolute -inset-6 rounded-full blur-3xl transition-transform duration-700', stateStyles.scale, stateStyles.pulse)}
        style={{
          background: `radial-gradient(ellipse at center, ${activePalette.primary} 0%, ${activePalette.secondary} 50%, transparent 75%)`,
        }}
      />
    </div>
  );
}
```

#### 4. Clean Integration into `SlideStage` or `SimulatorRoom`
- Option A (`SlideStage` inclusion): Embed `SlideAmbientLighting` inside `SlideStage` behind the slide card so the active slide carries its dynamic ambient lighting.
- Option B (`SimulatorRoom` inclusion): Replace lines 107-114 of `SimulatorRoom.tsx` with:
  ```tsx
  <SlideAmbientLighting
    slideIndex={position}
    state={derivePresenterState({ micActive: engine.micActive, hearing, speakingPersonaId: engine.speakingPersonaId })}
  />
  ```

---

## 5. Verification Method

To verify the investigation and future implementation:
1. **Run Unit & Integration Tests**:
   ```bash
   npx vitest run src/features/simulator
   npm test
   ```
2. **Inspect Slide Rendering & State Flow**:
   - Open `src/features/simulator/SlideStage.tsx` and `src/features/simulator/SimulatorRoom.tsx`.
   - Confirm `SlideStage` renders `<AuthenticatedSlideImage>` and position indicators.
   - Verify `useSimulationEngine` tracks `micActive`, `interim`, and `speakingPersonaId`.
3. **Invalidation Conditions**:
   - If tests fail or presenter state transitions produce UI layout shifts, the lighting container must remain `position: absolute` with `-z-10` or `pointer-events-none`.
