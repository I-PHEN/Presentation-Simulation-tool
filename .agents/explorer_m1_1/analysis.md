# Simulator & Presentation Sparring Partner Codebase Analysis Report

## Overview
This document presents the detailed architectural and visual component analysis for **Milestone 1 (Exploration & Codebase Analysis)** of the Presentation Sparring Partner enhancement project.

---

## 1. Directory & File Inventory

| Component / Module | File Path | Type | Purpose |
|-------------------|-----------|------|---------|
| **Rehearse Page** | `src/app/rehearse/[sessionId]/page.tsx` | Next.js Page | Entry point for rehearsal sessions. Loads session data from `/api/session/[id]` and mounts `SimulatorRoom`. |
| **SimulatorRoom** | `src/features/simulator/SimulatorRoom.tsx` | Container Component | Top-level room view managing layout, full-screen maximize state, keyboard shortcuts, ambient backdrop glow, stage, sidebars, toolbar, and overlays. |
| **SlideStage** | `src/features/simulator/SlideStage.tsx` | Presentation Stage | Renders presentation slide images inside an aspect-ratio-bound frame (`h-full w-fit`) with slide position mono badge (`01 / 10`). |
| **TopicStage** | `src/features/simulator/TopicStage.tsx` | Presentation Stage | Alternate stage for text/topic rehearsals without slide decks. Displays topic title and structured angle prompts. |
| **StageCaption** | `src/features/simulator/StageCaption.tsx` | Caption / Subtitle | Bottom caption bar under slide (or floating subtitle overlay in maximized mode) streaming real-time panel dialogue. |
| **AudiencePanel** | `src/features/simulator/AudiencePanel.tsx` | Roster Sidebar | Displays the active AI panel personas alongside presenter ("You") mic status and real-time activity indicators. |
| **TranscriptPanel** | `src/features/simulator/TranscriptPanel.tsx` | Live Transcript | Auto-scrolling transcript panel displaying presenter and examiner speech history with live WPM and filler word chips. |
| **SimulatorToolbar** | `src/features/simulator/SimulatorToolbar.tsx` | Floating Controls | Floating pill control bar containing slide navigation, session timer, recording status, mic toggle, camera toggle, panel toggles, maximize button, and end rehearsal trigger. |
| **CameraPip** | `src/features/simulator/CameraPip.tsx` | Floating Video | Draggable 16:9 mirrored self-view picture-in-picture overlay on top of the stage. |
| **SessionTimer** | `src/features/simulator/SessionTimer.tsx` | Control / Indicator | Self-ticking timer pill displaying elapsed time and clickable pace targets (`paceState`). |
| **ActivityBars** | `src/features/simulator/ActivityBars.tsx` | Visual Indicator | 4-bar equalizer indicator animated during active presenter or examiner speech. |
| **Simulation Engine Hook** | `src/features/simulator/use-simulation-engine.ts` | State Hook | Central state engine managing phases, mic capture (STT), panel TTS, transcript accumulation, timer, slide changes, and API persistence. |
| **Simulation Controller** | `src/features/simulator/simulation-controller.ts` | State Machine | Core state machine managing slide index, turn-taking, examiner request flow, and session persistence (`PATCH /api/session/[id]`). |
| **Panel Voice Controller** | `src/features/simulator/panel-voice.ts` | Voice Controller | Manages panel speech generation (Cartesia TTS), playback lock, mic pause/resume coordination, and character-by-character caption streaming. |
| **Global Styles** | `src/app/globals.css` | Stylesheet | Theme CSS variables, Tailwind tokens, `.glass-panel`, `.glass-card`, `.ambient-glow`, and keyframe animations. |

---

## 2. Component Hierarchy & Layout Structure

```
RehearseRoomPage (src/app/rehearse/[sessionId]/page.tsx)
 └── SimulatorRoom (src/features/simulator/SimulatorRoom.tsx)
      ├── Header Status Bar (<header> - hidden when maximized)
      │    ├── Exit Link ("Exit rehearsal" -> /dashboard)
      │    ├── Deck/Topic Title (session.deck.sourceName / "Topic rehearsal")
      │    └── Slide Counter / Status Indicator ("Slide X / Y")
      ├── Main Area (<main> - responsive grid layout)
      │    ├── Stage Column (div.relative flex flex-col)
      │    │    ├── Ambient Glow Backdrop (div.ambient-glow)
      │    │    ├── SlideStage (src/features/simulator/SlideStage.tsx)
      │    │    │    └── AuthenticatedSlideImage & Mono Position Badge
      │    │    │    -- OR --
      │    │    ├── TopicStage (src/features/simulator/TopicStage.tsx)
      │    │    │    └── Topic Heading & Angle Prompts List
      │    │    ├── CameraPip (src/features/simulator/CameraPip.tsx) [Optional]
      │    │    │    └── Mirrored Video Element (draggable)
      │    │    └── StageCaption (src/features/simulator/StageCaption.tsx)
      │    │         └── Speaker Badge & Live Streaming Caption Text
      │    └── Aside Column (<aside> - toggled via toolbar)
      │         ├── AudiencePanel (src/features/simulator/AudiencePanel.tsx)
      │         │    ├── Presenter Self-Status Row ("You") + ActivityBars
      │         │    └── AI Persona Roster Rows + ActivityBars
      │         └── TranscriptPanel (src/features/simulator/TranscriptPanel.tsx)
      │              ├── Header Metrics Chips (WPM, Fillers)
      │              └── Scrollable Speech List (<ol>)
      ├── Footer Controls (<footer>)
      │    └── SimulatorToolbar (src/features/simulator/SimulatorToolbar.tsx)
      │         ├── Slide Nav Arrows (← →)
      │         ├── SessionTimer (src/features/simulator/SessionTimer.tsx)
      │         ├── Rec Badge (if recording)
      │         ├── Mic Toggle + ActivityBars + Status Text
      │         ├── Camera Toggle
      │         ├── Audience Panel Toggle
      │         ├── Transcript Panel Toggle
      │         ├── Maximize/Fullscreen Toggle
      │         └── End Rehearsal Button (PhoneOff)
      └── Phase Overlays (Absolute Backdrops)
           ├── Ready Overlay (phase === 'ready'): Blur backdrop + "Begin" button
           └── Ended Overlay (phase === 'ended'): Blur backdrop + "See your report" button
```

---

## 3. Detailed Component Analysis

### 3.1 SimulatorRoom (`src/features/simulator/SimulatorRoom.tsx`)
- **Props**:
  - `session`: `SimSession` (`{ id, deck, mode, stance, transcriptSegments, examinerEvents, status, source }`)
  - `onComplete`: `() => void`
- **Layout & Layout Math**:
  - Occupies full viewport height using Tailwind `h-dvh flex flex-col overflow-hidden`.
  - Main grid uses `grid min-h-0 w-full flex-1 grid-rows-1 overflow-hidden`.
  - When `showAside` is true:
    - Desktop (`lg`): `lg:grid-cols-[minmax(0,1fr)_22rem]` (stage takes 1fr, aside takes 22rem fixed width).
    - Mobile (`max-lg`): `max-lg:grid-rows-[minmax(0,1fr)_minmax(0,auto)]` (aside capped at `max-h-[40dvh]`).
  - Fullscreen / Maximized behavior: Hides header, floats toolbar over stage bottom (`pointer-events-none absolute inset-x-0 bottom-0 z-20`), turns caption into floating video subtitle (`overlay={true}`). Keyboard shortcut `F` toggles fullscreen via `roomRef.current.requestFullscreen()`.

### 3.2 Header Status Bar
- **Location**: Inlined inside `<header>` of `SimulatorRoom.tsx`.
- **Height**: Fixed 10 Tailwind units (`h-10 shrink-0`).
- **Styling**: `border-b border-border bg-background px-3 sm:px-4 flex items-center justify-between`.
- **Content**:
  1. Exit link: `<a href="/dashboard">Exit rehearsal</a>` (`text-sm text-muted-foreground hover:text-foreground`).
  2. Main Title: Truncated text (`font-medium text-sm`) showing `session.deck.sourceName` or `"Topic rehearsal"`.
  3. Status / Slide counter: `Slide ${position + 1} / ${total}` or `"Speaking to your topic"`.

### 3.3 Slide Canvas Components
- **SlideStage** (`src/features/simulator/SlideStage.tsx`):
  - Props: `slide: { index, text, imageUrl }`, `position: number`, `total: number`.
  - Container: `flex min-h-0 min-w-0 flex-1 items-center justify-center`.
  - Inner frame: `relative flex h-full w-fit min-w-0 max-w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card`. Note: Uses `h-full w-fit` so slide image maintains natural aspect ratio without dead gutters.
  - Position badge: `absolute right-3 top-3 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] backdrop-blur`. Formatted like `01 / 12`.
- **TopicStage** (`src/features/simulator/TopicStage.tsx`):
  - Props: `topic: string`.
  - Display: Text-only stage displaying the primary prompt in display typography (`font-display text-2xl sm:text-4xl`), accompanied by three angle prompts (`ANGLE_PROMPTS`: claim, evidence, counter-argument).

### 3.4 Floating Controls & Toolbars
- **SimulatorToolbar** (`src/features/simulator/SimulatorToolbar.tsx`):
  - Props: `micActive`, `hearing`, `recording`, `maximized`, `timer`, `camera`, `slideNav`, toggle handlers (`onToggleMic`, `onToggleParticipants`, `onToggleTranscript`, `onEnd`, `onToggleMaximized`).
  - Styling: Floating pill shape (`rounded-full border border-border bg-popover px-3 py-1.5 shadow-e3`).
  - Slide Navigation: Displays arrow key hints (`← →`), `<ChevronLeft>` and `<ChevronRight>` icon buttons.
  - Recording indicator: Red pill with pulsing dot (`bg-destructive/10 text-destructive`).
  - Session Timer (`SessionTimer.tsx`): Interactive font-mono timer pill displaying `mm:ss`. Clicking cycles target durations (e.g. 3m, 5m, 10m). Pace states (`none`, `ok`, `close`, `over`) apply color highlights.
  - Mic Toggle: Icon button (`<Mic>` / `<MicOff>`). When mic is active, displays `ActivityBars` and `"Speaking"` / `"Listening"` status text.
  - Camera Toggle: Icon button (`<Video>` / `<VideoOff>`).
  - Maximized Toggle: Icon button (`<Maximize2>` / `<Minimize2>`).
  - End Rehearsal Button: Destructive pill button (`<PhoneOff>` icon + `"End rehearsal"`).

### 3.5 Modals & Overlays
- **Ready Phase Overlay**:
  - `phase === 'ready'` in `SimulatorRoom.tsx`.
  - Backdrop: `absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-xl`.
  - Content: Text prompt preparing the user + prominent "Begin" button.
- **Ended Phase Overlay**:
  - `phase === 'ended'` in `SimulatorRoom.tsx`.
  - Backdrop: `absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-xl`.
  - Content: "Rehearsal complete." + "See your report" button (disabled until `canFinish()` returns true).
- **StageCaption Overlay (Maximized Subtitle)**:
  - `overlay === true` in `StageCaption.tsx`.
  - Position: `pointer-events-none absolute inset-x-4 bottom-16 z-10 mx-auto max-w-4xl bg-popover/95 py-3 backdrop-blur-sm`.

### 3.6 Panel Headers & Sidebars
- **AudiencePanel** (`src/features/simulator/AudiencePanel.tsx`):
  - Props: `panel: Persona[]`, `speakingPersonaId: string | null`, `self?: SelfState`.
  - Card style: `glass-panel p-3` (`bg-white/70 dark:bg-card/70 backdrop-blur-md border`).
  - Self Row: Top row representing presenter ("You"). Shows `<Mic>` or `<MicOff>`, `ActivityBars`, and status ("Mic off", "Listening for you", or "Speaking").
  - Persona Rows: Displays circular avatar with persona initial, title, focus area, and `ActivityBars` indicator ("Speaking" / "Listening").
- **TranscriptPanel** (`src/features/simulator/TranscriptPanel.tsx`):
  - Props: `segments: TranscriptSegment[]`, `interim: string`, `metrics: SpeechMetrics`.
  - Layout: `flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-e1`.
  - Top header: Contains WPM chip (`metrics.wpm`) and Filler Words chip (`metrics.fillerCount`).
  - Speech List: `<ol ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">`. Auto-scrolls to bottom on new segments. Presenter segments styled with `bg-surface`, examiner segments styled with `bg-accent/60`.

---

## 4. Slide State & Presenter State Management

### 4.1 Architecture Diagram

```
                 +-----------------------------------+
                 |        SimulatorRoom Component    |
                 +-----------------------------------+
                                   |
                                   v
               +---------------------------------------+
               |         useSimulationEngine           |
               +---------------------------------------+
                /                  |                  \
               v                   v                   v
     +-------------------+ +--------------------+ +-------------------+
     | simulation-       | | panel-voice        | | Web Speech STT /  |
     | controller        | | controller         | | Cartesia TTS      |
     +-------------------+ +--------------------+ +-------------------+
               |                   |                   |
               v                   v                   v
     - active slide index  - speakingPersonaId   - mic capture stream
     - transcript segments - caption text stream - interim speech text
     - examiner events     - mic pause/resume    - delivery samples
     - PATCH persistence   - TTS audio playback  - camera stream
```

### 4.2 State Breakdown

1. **Slide Navigation State**:
   - `session.deck.slides`: Array of slides provided in session props.
   - `state.slideIndex`: Active slide index, managed by `simulation-controller`.
   - `position`: Computed index in `session.deck.slides` array.
   - `changeSlide(pos)`: Async function calling `controller.changeSlide(targetIndex)`. Automatically pauses STT capture briefly and resumes for the new slide context.
   - Keybindings: `nextSlideForKey` in `slide-keys.ts` routes keypresses (`ArrowRight`, `ArrowLeft`, `PageDown`, `PageUp`, `Home`, `End`, `Space`, `Shift+Space`) to `changeSlide`.

2. **Presenter & Microphone State**:
   - `captureState`: `'idle' | 'listening' | 'paused'`.
   - `micActive`: Derived boolean (`captureState === 'listening'`).
   - `interim`: Live string of recognized speech in progress.
   - `hearing`: Derived boolean (`interim.trim().length > 0`).
   - Microphone Capture: Created via `createSTT` from `@/lib/voice-engine`. Emits interim text to update UI, and commits finalized `TranscriptSegment` to `simulation-controller`.
   - Persistence: `simulation-controller` sends `PATCH /api/session/[id]` with updated `transcriptSegments`, `examinerEvents`, and `status`.

3. **Panel / Examiner State & Audio Coordination**:
   - Panel composition: `assemblePanel()` generates the 3 AI examiner personas.
   - `speakingPersonaId`: Stores the ID of the persona currently speaking via TTS (or `null` when quiet).
   - Audio Coordination: When an examiner speaks, `panel-voice` calls `pauseCapture()` to mute the presenter's microphone, preventing self-echo or false transcription of TTS output. When TTS playback ends, `resumeCapture()` automatically re-enables microphone listening.
   - Caption Streaming: Captions are updated progressively character-by-character to match speech output.

---

## 5. CSS Tokens, Styling & Glassmorphism Analysis

- **CSS Variables & Color Tokens (`src/app/globals.css`)**:
  - Light mode: Clean high-contrast palette (`--background: #FBFBFD; --card: #FFFFFF; --primary: #3E5FD9`).
  - Dark mode: Deep ink theme (`--background: #08090C; --card: #101217; --primary: #4C8DFF`).
- **Glassmorphism Tokens**:
  - `.glass-panel`: Light mode `rgba(255, 255, 255, 0.7)` with `backdrop-filter: blur(12px)`. Dark mode `rgba(16, 18, 23, 0.7)` with `backdrop-filter: blur(14px)`.
  - `.glass-card`: Light mode `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(16px)`. Dark mode `rgba(16, 18, 23, 0.8)` with `backdrop-filter: blur(16px)`.
- **Ambient Lighting Glow**:
  - `.ambient-glow`: Positioned absolutely behind the stage frame (`inset: -12px`). Uses radial gradient `radial-gradient(circle at 50% 50%, var(--primary), transparent 70%)` with `blur(24px)` (or `blur(32px)` in dark mode).
  - Dynamic state scaling in `SimulatorRoom.tsx`:
    - `speakingPersonaId` active: `opacity-30 scale-105`
    - `micActive` true: `opacity-20`
    - Quiet/Idle: `opacity-10`

---

## 6. Synthesis & Key Findings for Subsequent Milestones

1. **Milestone 2 (Glassmorphism Tokens)**:
   - Expand `.glass-panel` and `.glass-card` CSS utility classes in `globals.css` with structured tokens for dynamic backdrop blur and subtle border reflection highlights.
2. **Milestone 3 (Multi-Band Audio Visualizer)**:
   - Replace or enhance `ActivityBars.tsx` with dedicated multi-band equalizer/waveform visualizer components accepting `type: 'input' | 'output'`, `stream`, `audioNode`, or `isActive`.
   - Note: The incoming audio visualizer in Milestone 3 will supersede or update `ActivityBars.tsx`, resolving the bar count mismatch described in Section 7.
3. **Milestone 4 (Dynamic Slide Palette Ambient Lighting)**:
   - Enhance `.ambient-glow` in `SimulatorRoom.tsx` to accept dynamic slide color values (`activeSlideColor`) and presenter state colors beyond the default primary theme variable.
4. **Milestone 5 (SimulatorRoom Integration & Verification)**:
   - Seamlessly tie together visualizer, dynamic palette, and glassmorphic tokens in `SimulatorRoom.tsx` with full unit test coverage.

---

## 7. Verification & Test Suite Findings

A full execution of `npx vitest run src/features/simulator` yielded **96 passing tests out of 98 tests** across 21 test files.

### 7.1 Test Mismatch Breakdown
- **Failed Test 1**: `ActivityBars.test.tsx` -> `animates three bars while a voice is active`
  - *Assertion Error*: `expected [ 'animate-[sp-eq', ... ] to have a length of 3 but got 4`.
- **Failed Test 2**: `AudiencePanel.test.tsx` -> `animates only the voice that is actually active`
  - *Assertion Error*: `expected [ 'animate-[sp-eq', ... ] to have a length of 3 but got 4`.

### 7.2 Root Cause Analysis
In `src/features/simulator/ActivityBars.tsx` (line 14), the implementation maps over 4 elements:
```tsx
{[0, 1, 2, 3].map((bar) => (...))}
```
However, the docstring comment in `ActivityBars.tsx` states *"Three bars that rise and fall..."*, and both `ActivityBars.test.tsx` and `AudiencePanel.test.tsx` assert `expect(html.match(/animate-\[sp-eq/g)).toHaveLength(3)`.

This discrepancy between implementation (4 bars) and test expectations (3 bars) is noted here for the implementer agent of Milestone 3, who will be creating the multi-band equalizer visualizer component to replace/upgrade `ActivityBars.tsx`.

