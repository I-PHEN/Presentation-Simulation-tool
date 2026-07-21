import { describe, expect, it } from 'vitest';
import { selectNextSpeaker } from './turn-selection';
import { assemblePanel } from './personas';

const panel = assemblePanel(); // [professor, examiner, peer]
const spoke = (id: string) => ({ persona: { id } });

describe('selectNextSpeaker', () => {
  it('picks the first panel member when nobody has spoken', () => {
    expect(selectNextSpeaker(panel, []).id).toBe('professor');
  });

  it('spreads turns to the members who have not spoken yet', () => {
    expect(selectNextSpeaker(panel, [spoke('professor')]).id).toBe('examiner');
    expect(selectNextSpeaker(panel, [spoke('professor'), spoke('examiner')]).id).toBe('peer');
  });

  it('after a full round, returns to the least-recently-spoken member', () => {
    const events = [spoke('professor'), spoke('examiner'), spoke('peer')];
    expect(selectNextSpeaker(panel, events).id).toBe('professor');
  });

  it('ignores events without a persona tag', () => {
    expect(selectNextSpeaker(panel, [{}, spoke('professor')]).id).toBe('examiner');
  });

  it('throws on an empty panel', () => {
    expect(() => selectNextSpeaker([], [])).toThrow();
  });
});
