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

export interface SlidePalette {
  primary: string;
  secondary: string;
  accent: string;
}

export const PALETTE_PRESETS: SlidePalette[] = [
  { primary: 'rgba(59, 130, 246, 0.8)', secondary: 'rgba(99, 102, 241, 0.6)', accent: 'rgba(14, 165, 233, 0.4)' },  // Blue / Indigo
  { primary: 'rgba(20, 184, 166, 0.8)', secondary: 'rgba(16, 185, 129, 0.6)', accent: 'rgba(6, 182, 212, 0.4)' },   // Teal / Emerald
  { primary: 'rgba(168, 85, 247, 0.8)', secondary: 'rgba(236, 72, 153, 0.6)', accent: 'rgba(139, 92, 246, 0.4)' },  // Purple / Pink
  { primary: 'rgba(245, 158, 11, 0.8)', secondary: 'rgba(239, 68, 68, 0.6)', accent: 'rgba(251, 191, 36, 0.4)' },   // Amber / Warm
  { primary: 'rgba(99, 102, 241, 0.8)', secondary: 'rgba(147, 51, 234, 0.6)', accent: 'rgba(79, 70, 229, 0.4)' },   // Indigo / Violet
];

export function getSlidePalette(slideIndex: number, customPalette?: Partial<SlidePalette>): SlidePalette {
  const defaultPreset = PALETTE_PRESETS[Math.abs(slideIndex) % PALETTE_PRESETS.length];
  if (!customPalette) return defaultPreset;
  return {
    primary: customPalette.primary ?? defaultPreset.primary,
    secondary: customPalette.secondary ?? defaultPreset.secondary,
    accent: customPalette.accent ?? defaultPreset.accent,
  };
}
