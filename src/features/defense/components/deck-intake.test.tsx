import { describe, expect, it } from 'vitest';
import { parseUploadedDeck } from './deck-intake';

describe('parseUploadedDeck', () => {
  it('rejects malformed successful upload responses', () => {
    expect(parseUploadedDeck({ deck: { sourceName: '', slides: [] } })).toBeNull();
    expect(parseUploadedDeck({ deck: { sourceName: 'Thesis.pdf', slides: [{ index: 0, text: '', imageUrl: '/slide.png' }] } })).toBeNull();
    expect(parseUploadedDeck({ deck: { sourceName: 'Thesis.pdf', slides: [{ index: 1, text: 42, imageUrl: '/slide.png' }] } })).toBeNull();
  });

  it('accepts a complete deck context from a successful upload response', () => {
    expect(parseUploadedDeck({ deck: { sourceName: 'Thesis.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide.png' }] } })).toEqual({
      sourceName: 'Thesis.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide.png' }],
    });
  });
});
