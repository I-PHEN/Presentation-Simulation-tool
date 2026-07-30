# Original User Request

## 2026-07-26T23:08:28Z

Enhance Presentation Sparring Partner with a Studio Glassmorphism visual theme, including multi-band audio visualizers, slide-palette dynamic ambient backlighting, and sleek dark mode controls while adhering strictly to existing UI design tokens.

Working directory: c:/Users/Michael/Downloads/sparring-partner
Integrity mode: development

## Requirements

### R1. Studio Glassmorphism & Design System Fidelity
- Implement backdrop-blur glass panels, subtle border reflections, and dark/light mode surface tokens without breaking existing layout structures or component APIs.
- Ensure all new styles use CSS variable tokens defined in `globals.css` and Tailwind utilities.

### R2. Glowing Multi-Band Audio Visualizers
- Create a multi-band equalizer/waveform component for audio input (presenter microphone) and audio output (Cartesia TTS speaking) that responds dynamically to audio signals.

### R3. Dynamic Slide Palette Ambient Lighting
- Add an ambient backdrop backlight effect behind the presentation slide canvas that subtly reflects the dominant color theme of the active slide or presenter state.

## Acceptance Criteria

### Visual Integration & Quality
- [ ] Multi-band audio visualizer component integrated into `SimulatorRoom` and header status bars.
- [ ] Slide canvas features smooth ambient lighting glow transitioning as slides or state changes.
- [ ] Glassmorphism backdrop blur effects applied cleanly to floating controls, modals, and panel headers.
- [ ] 0 layout regressions; fully compliant with dark/light mode themes.

## 2026-07-30T17:30:30Z

Redesign and build a distinct 1-on-1 AI Coaching Room separate from the 4-examiner Testing Rehearsal Room, featuring a single dedicated coach (Coach Sarah/Marcus), dedicated teleprompter guide, and 1-on-1 speech coaching feedback.

Working directory: c:\Users\Michael\Downloads\sparring-partner

## Requirements

### R1. Distinct 1-on-1 Coaching Studio UI
Build a dedicated Coaching Studio interface for `/coaching/[sessionId]` that is visually and functionally distinct from the 4-examiner Testing Simulator (`SimulatorRoom`).
- Display ONLY ONE Coach Avatar (Coach Sarah or Coach Marcus, based on user preference), not the 4-person audience panel grid.
- Display a distinct header badge (`🎓 1-on-1 Executive Coaching Studio`).

### R2. Single Coach Persona & Spoken Guidance
- Only the selected Coach persona (Coach Sarah / Coach Marcus) speaks during coaching sessions (room intro, slide tips, and live advice).
- Eliminate all 4-examiner event loops and interruptions in coaching mode.

### R3. Integrated Delivery Teleprompter & Speech Pacing
- Include the 2-row delivery guide teleprompter (Opening Hook + 3 Horizontal Triad Talking Points: Context, Solution, Impact).
- Live speech WPM meter with optimal cadence indicator (130-150 WPM).
- Single primary action: **"🎙️ Ask Coach for Live Advice"** (transcribes presenter's actual speech and speaks custom advice aloud).
- Secondary action: **"✨ Coach Rescue: Model Pitch Script"**.

## Acceptance Criteria

### Distinct Room Separation
- [ ] Navigating to `/coaching/[id]` opens the 1-on-1 Coaching Studio with 1 coach avatar, NOT the 4-examiner panel.
- [ ] Navigating to `/rehearse/[id]` or `/practice/[id]` opens the 4-examiner Defense Simulator.
- [ ] Unit tests pass for both `CoachingRoom` and `SimulatorRoom`.
