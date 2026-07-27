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

## Follow-up — 2026-07-27T00:05:43Z

Resume work as Project Orchestrator (Successor Gen 1) for the Presentation Sparring Partner enhancement project.
Milestones 1, 2, and 3 are DONE.
Active focus:
1. Execute Milestone 4 (Dynamic Slide Palette Ambient Lighting): create dynamic backlight effect reflecting dominant active slide color and presenter state behind presentation slide canvas.
2. Execute Milestone 5 (SimulatorRoom Integration & Final Verification Gate): integrate audio visualizer into `SimulatorRoom` header status bar, integrate slide canvas ambient lighting into `SimulatorRoom` / `SlideStage`, run 2 Reviewers, 2 Challengers, and Forensic Auditor for final clean pass.
3. Report final victory to main agent parent (ee245e76-0a9f-4b04-8aa3-d96c4be76d03) when all acceptance criteria are met and verified.

