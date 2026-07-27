# Project: Presentation Sparring Partner Theme & Visualizer Enhancements

## Architecture
- Frontend Application (React / Next.js / Tailwind CSS)
- Audio Handling: Presenter Mic Input & Cartesia TTS Output audio nodes/streams
- Design System: `globals.css` CSS variables, Tailwind tokens, Glassmorphism utilities
- Key Components: `SimulatorRoom`, Header Status Bar, Audio Visualizer, Slide Canvas Backdrop

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Analysis | Codebase investigation, AudioContext, CSS variables, build/test scripts | None | DONE |
| 2 | Studio Glassmorphism Tokens & CSS | `globals.css`, Tailwind config, backdrop-blur tokens, subtle border reflections | M1 | DONE |
| 3 | Glowing Multi-Band Audio Visualizer | Equalizer/waveform component for audio input & Cartesia TTS output | M1 | DONE |
| 4 | Dynamic Slide Palette Ambient Lighting | Ambient backlight effect reflecting slide color/presenter state | M1 | IN_PROGRESS |
| 5 | SimulatorRoom Integration & Verification | Integrate components, full verification (build, test, dark/light mode, audit) | M2, M3, M4 | PLANNED |

## Interface Contracts
### Audio Visualizer Interface
- Component props: `stream?: MediaStream`, `audioNode?: AudioNode`, `isActive?: boolean`, `type: 'input' | 'output'`, `className?: string`

### Ambient Lighting Interface
- Props/State: `activeSlideColor?: string`, `presenterState?: string`, `containerClassName?: string`

## Code Layout
- Target repository root: `c:/Users/Michael/Downloads/sparring-partner`
