# Handoff Report — Explorer M4.3: SimulatorRoom & Header Status Bar Integration Analysis

## 1. Observation

### 1.1 `SimulatorRoom.tsx` Architecture & State Flow
File: `src/features/simulator/SimulatorRoom.tsx` (170 lines)
- **Header Section (lines 90–96)**:
  ```tsx
  {!maximized && (
    <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 sm:px-4">
      <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Exit rehearsal</a>
      <p className="min-w-0 truncate text-sm font-medium">{isTopic ? 'Topic rehearsal' : session.deck.sourceName}</p>
      <span className="shrink-0 text-sm text-muted-foreground">{isTopic ? 'Speaking to your topic' : `Slide ${position + 1} / ${total}`}</span>
    </header>
  )}
  ```
- **Main Stage Container (lines 101–127)**:
  ```tsx
  <main className={cn(
    'grid min-h-0 w-full flex-1 grid-rows-1 overflow-hidden',
    maximized ? 'gap-0 p-0' : 'gap-2 p-2 lg:mx-auto lg:max-w-[1600px] lg:gap-3',
    showAside && 'max-lg:grid-rows-[minmax(0,1fr)_minmax(0,auto)] lg:grid-cols-[minmax(0,1fr)_22rem]',
  )}>
    <div className={cn('relative flex min-h-0 min-w-0 flex-col', !maximized && 'gap-2')}>
      {/* Dynamic Ambient Backlight Glow */}
      <div
        className={cn(
          'ambient-glow transition-all duration-700',
          engine.speakingPersonaId ? 'opacity-30 scale-105' : engine.micActive ? 'opacity-20' : 'opacity-10',
        )}
        aria-hidden="true"
      />
      {isTopic
        ? <TopicStage topic={session.deck.slides[0]?.text ?? ''} />
        : <SlideStage slide={engine.slide} position={position} total={total} />}
      {camera.enabled && <CameraPip attach={camera.attach} />}
      <StageCaption ... />
    </div>
  ```
- **Engine Exposed Audio & Persona States** (`src/features/simulator/use-simulation-engine.ts`, lines 165–176):
  - Presenter mic state: `micActive: captureState === 'listening'` (boolean)
  - Presenter active speech: `hearing = engine.interim.trim().length > 0` (boolean)
  - Cartesia TTS / Examiner speaking: `speakingPersonaId` (`string | null`), `captionPersonaId` (`string | null`)
  - Recording state: `recording` (`boolean`)

### 1.2 Audio Visualizer Components & Contracts
- **`src/components/audio-visualizer.tsx`**:
  - Props Contract:
    ```ts
    export interface AudioVisualizerProps {
      stream?: MediaStream;
      audioNode?: AudioNode;
      isActive?: boolean;
      type?: 'input' | 'output';
      variant?: 'mic' | 'speaker';
      barCount?: number;
      className?: string;
    }
    ```
  - Visual Design Tokens (lines 45–48):
    - `input` (presenter mic): Vibrant emerald/cyan glow (`from-emerald-500 to-cyan-400 dark:from-emerald-400 dark:to-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.6),0_0_20px_rgba(16,185,129,0.4)]`).
    - `output` (Cartesia TTS): Distinct violet/indigo glow (`from-indigo-500 to-violet-400 dark:from-indigo-400 dark:to-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.6),0_0_20px_rgba(99,102,241,0.4)]`).

- **`src/features/simulator/ActivityBars.tsx`**:
  - Compact multi-band activity bars (`barCount={4}`).
  - Uses `useAudioFrequencyData` hook with SSR/static keyframe fallback (`sp-eq`).

### 1.3 `SlideStage` & Ambient Glow CSS
- **`src/features/simulator/SlideStage.tsx`** (lines 16–25):
  - Renders slide image in `div className="relative flex h-full w-fit min-w-0 max-w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card"`.
  - Position index badge at `right-3 top-3` (`absolute`).
- **`src/app/globals.css`** (lines 186–200):
  ```css
  .ambient-glow {
    position: absolute;
    inset: -12px;
    border-radius: 1.5rem;
    background: radial-gradient(circle at 50% 50%, var(--primary), transparent 70%);
    opacity: 0.15;
    filter: blur(24px);
    pointer-events: none;
    transition: opacity 0.5s ease;
  }
  .dark .ambient-glow {
    opacity: 0.22;
    filter: blur(32px);
  }
  ```

### 1.4 Test Suite Inspections
- **`src/features/simulator/SlideStage.test.tsx`** (lines 8–30):
  - Asserts `expect(html).toContain('border border-border')`.
  - Asserts `expect(html.match(/absolute/g)).toHaveLength(1)` (strictly expects ONLY 1 absolutely-positioned element inside `SlideStage`—the index badge!).
- **`src/features/simulator/ActivityBars.test.tsx`**:
  - Asserts 4 animated bars on `active={true}` (`animate-[sp-eq]`) and staggered delays.
- **`src/components/audio-visualizer.test.tsx`**:
  - Asserts `type="input"` emerald/cyan tokens, `type="output"` violet/indigo tokens, `variant="speaker"`, custom `barCount`.
- **`src/features/simulator/SimulatorToolbar.test.tsx`**:
  - Asserts mic activity `ActivityBars` rendering (`speaking.match(/animate-\[sp-eq/g)).toHaveLength(4)`).
- **`src/features/simulator/AudiencePanel.test.tsx`**:
  - Asserts persona speaking rows (`data-state="speaking"`) and presenter row (`self={{ micActive: true, hearing: true }}`).

---

## 2. Logic Chain

### 2.1 Header Status Bar & Audio Visualizer Mapping
1. **Observation**: The current header in `SimulatorRoom.tsx` (lines 90–96) is an inline `<header>` element containing basic plain text: Exit link, Deck source name, and Slide position indicator.
2. **Deduction**: Integrating multi-band audio visualizers and studio glassmorphism requires creating a dedicated `SimulatorHeader` component (or refactored status bar) in `src/features/simulator/SimulatorHeader.tsx`.
3. **Audio State Mapping**:
   - **Presenter Mic Activity (`type="input"`)**: When `micActive && hearing` is true, render an `input` visualizer with cyan/emerald glow tokens.
   - **Cartesia TTS / Examiner Voice (`type="output"`)**: When `speakingPersonaId !== null` is true, render an `output` visualizer with violet/indigo glow tokens.
4. **Header Layout Proposal**:
   - **Left**: Exit Rehearsal action link + optional Defense Mode / Stance badge (e.g. `rigorous`).
   - **Center**: Deck Title + Dual Audio Visualizer Status Pill:
     - When Presenter is speaking: `<AudioVisualizer type="input" isActive={micActive && hearing} barCount={4} className="h-4" />` with label `Presenter Speaking`.
     - When Examiner is speaking: `<AudioVisualizer type="output" isActive={speakingPersonaId !== null} barCount={4} className="h-4" />` with label `${speakingPersonaTitle} Speaking`.
     - When idle: Compact status badge showing current rehearsal phase.
   - **Right**: Recording badge (`Rec`) + Slide counter (`Slide X / Y`).
   - **Styling**: `glass-header flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border/40 bg-background/80 px-4 backdrop-blur-md shadow-sm`.

### 2.2 `SlideStage` & `SlideAmbientLighting` Layout Integration
1. **Observation**: `SlideStage.test.tsx` line 29 strictly tests `expect(html.match(/absolute/g)).toHaveLength(1)` inside `SlideStage`.
2. **Critical Constraint**: Modifying `SlideStage.tsx` internally to add an absolute ambient lighting container will break `SlideStage.test.tsx`.
3. **Deduction**: `SlideAmbientLighting` must be implemented as a separate component (`src/features/simulator/SlideAmbientLighting.tsx`) and placed in `SimulatorRoom.tsx` wrapping or backing `SlideStage` in the room container grid layout.
4. **`SlideAmbientLighting` Architecture**:
   - **Props Contract**:
     ```ts
     export interface SlideAmbientLightingProps {
       activeSlideColor?: string;
       speakingPersonaId?: string | null;
       micActive?: boolean;
       hearing?: boolean;
       containerClassName?: string;
       children?: React.ReactNode;
     }
     ```
   - **Visual & State Behavior**:
     - Positioned absolutely behind stage (`inset -16px`, `pointer-events-none`, `z-0`).
     - Uses CSS radial gradients driven by `activeSlideColor` (or `var(--primary)` fallback).
     - Scale & Opacity transitions:
       - **Examiner Probing / Speaking**: Amber/violet dynamic pulse (`opacity-40 scale-105 duration-700`).
       - **Presenter Speaking**: Cyan/emerald active aura (`opacity-30 scale-100 duration-500`).
       - **Idle / Listening**: Muted baseline aura (`opacity-15 duration-1000`).
     - **Maximized Mode**: Respects `maximized` room state with `overflow-hidden` so full screen slide presentation remains clean without scrollbar leaks.

### 2.3 Existing Test Suite Impact & New Test Plan
1. **Existing Tests**: All current tests (`SlideStage.test.tsx`, `ActivityBars.test.tsx`, `audio-visualizer.test.tsx`, `SimulatorToolbar.test.tsx`, `AudiencePanel.test.tsx`) pass.
2. **Test Safety Strategy**:
   - Keeping `SlideStage.tsx` isolated preserves its 3 test cases in `SlideStage.test.tsx`.
   - `AudioVisualizer` and `ActivityBars` already pass unit tests and contract validation.
3. **Recommended New Unit & Integration Tests**:
   - `src/features/simulator/SimulatorHeader.test.tsx`: Test static markup, header status bar audio visualizer presence during presenter speaking (`type="input"`) and examiner speaking (`type="output"`).
   - `src/features/simulator/SlideAmbientLighting.test.tsx`: Test container rendering, opacity/scale class switching for speaking states.
   - `src/features/simulator/SimulatorRoom.test.tsx`: Test full room assembly, header status bar rendering, slide stage layout, and overlay modal states.

---

## 3. Caveats

- **Read-Only Scope**: This report is produced under read-only investigation constraints. No source files under `src/` were modified by this agent.
- **Dynamic Slide Palette Color Extraction**: `SlideAmbientLighting` should accept `activeSlideColor?: string` with a fallback to `var(--primary)`. Full canvas image color extraction can be provided via a hook or prop by M4 worker.
- **Web Audio API SSR Handling**: `AudioVisualizer` and `ActivityBars` fall back to static CSS keyframe animations (`sp-eq`) during SSR/static markup test execution (`renderToStaticMarkup`), ensuring test runner compatibility.

---

## 4. Conclusion

1. **Header Integration**: Create `SimulatorHeader.tsx` featuring studio glassmorphism (`backdrop-blur-md`, `border-border/40`), dual audio status indicators using `AudioVisualizer` (`type="input"` for mic, `type="output"` for Cartesia TTS), and live recording/slide progress badges.
2. **Room & Ambient Lighting Integration**: Create `SlideAmbientLighting.tsx` backing `SlideStage` at the room container level in `SimulatorRoom.tsx`. This avoids modifying `SlideStage.tsx` internal DOM and keeps `SlideStage.test.tsx` 100% compliant.
3. **Testing Strategy**: Introduce `SimulatorHeader.test.tsx`, `SlideAmbientLighting.test.tsx`, and `SimulatorRoom.test.tsx` to maintain 100% test coverage across all quality gates.

---

## 5. Verification Method

To independently verify all findings and test suite compliance:

1. **TypeScript Compilation**:
   ```bash
   npx tsc --noEmit
   ```
2. **Linter Check**:
   ```bash
   npm run lint
   ```
3. **Full Test Suite Execution**:
   ```bash
   npm test
   ```
4. **Production Build**:
   ```bash
   npm run build
   ```
5. **Key Files to Inspect**:
   - `src/features/simulator/SimulatorRoom.tsx`
   - `src/features/simulator/SlideStage.tsx`
   - `src/features/simulator/SlideStage.test.tsx`
   - `src/components/audio-visualizer.tsx`
   - `src/features/simulator/ActivityBars.tsx`
