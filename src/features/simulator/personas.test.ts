import { describe, expect, it } from 'vitest';
import { PERSONAS, COACH_SARAH, COACH_MARCUS, assemblePanel, assembleCoachPanel } from './personas';

describe('assemblePanel', () => {
  it('returns the fixed 3-member defense panel in order', () => {
    const panel = assemblePanel();
    expect(panel.map((p) => p.id)).toEqual(['professor', 'examiner', 'peer']);
  });

  it('gives every persona a title, focus, prompt fragment, and voice id', () => {
    for (const persona of assemblePanel()) {
      expect(persona.title.length).toBeGreaterThan(0);
      expect(persona.focus.length).toBeGreaterThan(0);
      expect(persona.promptFragment.length).toBeGreaterThan(0);
      expect(persona.voiceId).toMatch(/^[A-Za-z0-9-]+$/);
    }
  });

  it('exposes the same persona objects through PERSONAS by id', () => {
    expect(assemblePanel()).toEqual([PERSONAS.professor, PERSONAS.examiner, PERSONAS.peer]);
  });

  it('returns single coach persona object with assembleCoachPanel and assemblePanel in guided mode', () => {
    expect(assembleCoachPanel('sarah')).toEqual(COACH_SARAH);
    expect(assembleCoachPanel('marcus')).toEqual(COACH_MARCUS);
    expect(assemblePanel('guided', 'sarah')).toEqual([COACH_SARAH]);
    expect(assemblePanel('guided', 'marcus')).toEqual([COACH_MARCUS]);
    expect(COACH_SARAH.voiceId).toBe('a7a59115-2425-4192-844c-1e98ec7d6877');
    expect(COACH_MARCUS.voiceId).toBe('533b2990-5b82-45a4-b9f2-367776972ca6');
  });
});

