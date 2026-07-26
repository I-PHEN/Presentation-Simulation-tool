import { describe, expect, it } from 'vitest';
import { nextTarget, paceState } from './session-timer';

const MIN = 60_000;

describe('paceState', () => {
  it('has no opinion without a target', () => {
    expect(paceState(9 * MIN, null)).toBe('none');
    expect(paceState(9 * MIN, 0)).toBe('none');
  });

  it('warns from 85% of the target and flags going over', () => {
    expect(paceState(5 * MIN, 10 * MIN)).toBe('ok');
    expect(paceState(8.4 * MIN, 10 * MIN)).toBe('ok');
    expect(paceState(8.5 * MIN, 10 * MIN)).toBe('close'); // exactly 85%
    expect(paceState(10 * MIN, 10 * MIN)).toBe('close'); // on the line is not yet over
    expect(paceState(10 * MIN + 1, 10 * MIN)).toBe('over');
  });
});

describe('nextTarget', () => {
  it('cycles through the presets and back to no target', () => {
    expect(nextTarget(null)).toBe(5 * MIN);
    expect(nextTarget(5 * MIN)).toBe(10 * MIN);
    expect(nextTarget(10 * MIN)).toBe(15 * MIN);
    expect(nextTarget(15 * MIN)).toBe(20 * MIN);
    expect(nextTarget(20 * MIN)).toBe(30 * MIN);
    expect(nextTarget(30 * MIN)).toBe(null);
  });

  it('recovers from a target that is not a preset', () => {
    expect(nextTarget(7 * MIN)).toBe(5 * MIN);
  });
});
