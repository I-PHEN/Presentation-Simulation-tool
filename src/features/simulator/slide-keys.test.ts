import { describe, expect, it } from 'vitest';
import { nextSlideForKey } from './slide-keys';

const deck = { position: 2, total: 5, enabled: true };

describe('nextSlideForKey', () => {
  it('moves forward and back with the arrow keys', () => {
    expect(nextSlideForKey('ArrowRight', deck)).toBe(3);
    expect(nextSlideForKey('ArrowLeft', deck)).toBe(1);
  });

  it('stops at both ends of the deck', () => {
    expect(nextSlideForKey('ArrowLeft', { ...deck, position: 0 })).toBe(null);
    expect(nextSlideForKey('ArrowRight', { ...deck, position: 4 })).toBe(null);
  });

  it('ignores keys that are not slide navigation', () => {
    for (const key of ['ArrowUp', 'ArrowDown', ' ', 'Enter', 'a']) {
      expect(nextSlideForKey(key, deck)).toBe(null);
    }
  });

  it('does nothing when navigation is off, as in topic mode with one card', () => {
    expect(nextSlideForKey('ArrowRight', { ...deck, enabled: false })).toBe(null);
    expect(nextSlideForKey('ArrowRight', { position: 0, total: 1, enabled: true })).toBe(null);
  });

  it('leaves typing and browser shortcuts alone', () => {
    expect(nextSlideForKey('ArrowRight', { ...deck, typing: true })).toBe(null);
    expect(nextSlideForKey('ArrowRight', { ...deck, modified: true })).toBe(null);
  });
});
