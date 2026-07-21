import { describe, expect, it } from 'vitest';
import { PERSONAS, assemblePanel } from './personas';

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
});
