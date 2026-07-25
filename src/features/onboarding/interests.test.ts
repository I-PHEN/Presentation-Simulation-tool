import { describe, expect, it } from 'vitest';
import { INTEREST_OPTIONS, addCustomInterest, normalizeInterests, toggleInterest } from './interests';

describe('normalizeInterests', () => {
  it('trims, drops empties, and dedupes case-insensitively', () => {
    expect(normalizeInterests(['  AI ', 'ai', '', 'Space'])).toEqual(['AI', 'Space']);
  });

  it('ignores non-array and non-string input', () => {
    expect(normalizeInterests('nope')).toEqual([]);
    expect(normalizeInterests([1, null, { x: 1 }, 'History'])).toEqual(['History']);
  });

  it('caps the number of interests', () => {
    const many = Array.from({ length: 30 }, (_, i) => `Topic ${i}`);
    expect(normalizeInterests(many)).toHaveLength(12);
  });
});

describe('toggleInterest', () => {
  it('adds a missing interest and removes an existing one (case-insensitive)', () => {
    expect(toggleInterest(['History'], 'Sports')).toEqual(['History', 'Sports']);
    expect(toggleInterest(['History', 'Sports'], 'history')).toEqual(['Sports']);
  });
});

describe('addCustomInterest', () => {
  it('appends a trimmed custom interest and ignores blanks + duplicates', () => {
    expect(addCustomInterest(['AI'], '  Robotics ')).toEqual(['AI', 'Robotics']);
    expect(addCustomInterest(['AI'], '   ')).toEqual(['AI']);
    expect(addCustomInterest(['AI'], 'ai')).toEqual(['AI']);
  });
});

describe('INTEREST_OPTIONS', () => {
  it('is a non-empty curated list', () => {
    expect(INTEREST_OPTIONS.length).toBeGreaterThan(6);
  });
});
