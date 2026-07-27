import { describe, expect, it } from 'vitest';
import {
  derivePresenterState,
  getSlidePalette,
  PALETTE_PRESETS,
  type PresenterLightingState,
} from '../slide-palette';

describe('slide-palette module', () => {
  describe('derivePresenterState', () => {
    it('returns examiner_speaking when examiner is speaking', () => {
      const state: PresenterLightingState = derivePresenterState({
        micActive: true,
        hearing: true,
        speakingPersonaId: 'dr-chen',
      });
      expect(state).toBe('examiner_speaking');
    });

    it('returns speaking when user is actively speaking and no examiner is speaking', () => {
      const state: PresenterLightingState = derivePresenterState({
        micActive: true,
        hearing: true,
        speakingPersonaId: null,
      });
      expect(state).toBe('speaking');
    });

    it('returns listening when mic is active but user is not speaking and examiner is silent', () => {
      const state: PresenterLightingState = derivePresenterState({
        micActive: true,
        hearing: false,
        speakingPersonaId: null,
      });
      expect(state).toBe('listening');
    });

    it('returns idle when mic is inactive and examiner is silent', () => {
      const state: PresenterLightingState = derivePresenterState({
        micActive: false,
        hearing: false,
        speakingPersonaId: null,
      });
      expect(state).toBe('idle');
    });
  });

  describe('PALETTE_PRESETS', () => {
    it('defines 5 distinct presets with primary, secondary, and accent colors', () => {
      expect(PALETTE_PRESETS).toHaveLength(5);
      const primarySet = new Set(PALETTE_PRESETS.map((p) => p.primary));
      expect(primarySet.size).toBe(5);

      PALETTE_PRESETS.forEach((palette) => {
        expect(palette.primary).toBeDefined();
        expect(palette.secondary).toBeDefined();
        expect(palette.accent).toBeDefined();
      });
    });
  });

  describe('getSlidePalette', () => {
    it('returns deterministic preset based on slideIndex', () => {
      const palette0 = getSlidePalette(0);
      const palette5 = getSlidePalette(5);
      expect(palette0).toEqual(PALETTE_PRESETS[0]);
      expect(palette5).toEqual(PALETTE_PRESETS[0]);

      const palette3 = getSlidePalette(3);
      expect(palette3).toEqual(PALETTE_PRESETS[3]);
    });

    it('handles negative slide indices deterministically', () => {
      const paletteNeg1 = getSlidePalette(-1);
      expect(paletteNeg1).toEqual(PALETTE_PRESETS[1]);
    });

    it('merges custom palette overrides over default preset', () => {
      const customPrimary = 'rgba(255, 0, 0, 0.8)';
      const palette = getSlidePalette(0, { primary: customPrimary });
      expect(palette.primary).toBe(customPrimary);
      expect(palette.secondary).toBe(PALETTE_PRESETS[0].secondary);
      expect(palette.accent).toBe(PALETTE_PRESETS[0].accent);
    });
  });
});
