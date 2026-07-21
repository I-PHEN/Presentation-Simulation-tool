import { describe, expect, it } from 'vitest';
import { emptyProfile, parseProfile, serializeProfile, type SpeakerProfileData } from './speaker-profile';

describe('speaker-profile serialization', () => {
  it('emptyProfile has zeroed longitudinal state', () => {
    expect(emptyProfile).toEqual({
      recurringWeaknesses: [],
      dimensionBaselines: {},
      totalSessions: 0,
      streak: 0,
      nextFocus: '',
    });
  });

  it('round-trips a populated profile through serialize/parse', () => {
    const profile: SpeakerProfileData = {
      recurringWeaknesses: [{ label: 'rushed closings', count: 2, firstSeen: '2026-07-01T00:00:00.000Z', lastSeen: '2026-07-10T00:00:00.000Z' }],
      dimensionBaselines: { clarity: { average: 72, samples: 3 } },
      totalSessions: 3,
      streak: 0,
      nextFocus: 'rushed closings',
    };
    const row = serializeProfile(profile);
    expect(typeof row.recurringWeaknesses).toBe('string');
    expect(typeof row.dimensionBaselines).toBe('string');
    expect(parseProfile(row)).toEqual(profile);
  });

  it('parseProfile falls back to empty state on malformed JSON', () => {
    const parsed = parseProfile({ recurringWeaknesses: 'not json', dimensionBaselines: '{}', totalSessions: 5, streak: 0, nextFocus: '' });
    expect(parsed.recurringWeaknesses).toEqual([]);
    expect(parsed.totalSessions).toBe(5);
  });
});

import { applyOutcomeToProfile, deriveNextFocus } from './speaker-profile';

const outcome = (over: Partial<import('./speaker-profile').SessionOutcome> = {}) => ({
  sessionId: 's1',
  dimensions: { clarity: 60, confidence: 80 },
  weaknesses: ['rushed closings'],
  completedAt: '2026-07-10T00:00:00.000Z',
  ...over,
});

describe('applyOutcomeToProfile', () => {
  it('does not mutate the input profile', () => {
    const before = { ...emptyProfile };
    applyOutcomeToProfile(emptyProfile, outcome());
    expect(emptyProfile).toEqual(before);
  });

  it('seeds baselines, weaknesses, and totalSessions from an empty profile', () => {
    const next = applyOutcomeToProfile(emptyProfile, outcome());
    expect(next.dimensionBaselines).toEqual({ clarity: { average: 60, samples: 1 }, confidence: { average: 80, samples: 1 } });
    expect(next.recurringWeaknesses).toEqual([{ label: 'rushed closings', count: 1, firstSeen: '2026-07-10T00:00:00.000Z', lastSeen: '2026-07-10T00:00:00.000Z' }]);
    expect(next.totalSessions).toBe(1);
    expect(next.streak).toBe(0);
  });

  it('rolls dimension averages and increments repeated weaknesses', () => {
    const first = applyOutcomeToProfile(emptyProfile, outcome());
    const second = applyOutcomeToProfile(first, outcome({ sessionId: 's2', dimensions: { clarity: 80 }, weaknesses: ['rushed closings'], completedAt: '2026-07-11T00:00:00.000Z' }));
    expect(second.dimensionBaselines.clarity).toEqual({ average: 70, samples: 2 });
    expect(second.dimensionBaselines.confidence).toEqual({ average: 80, samples: 1 });
    expect(second.recurringWeaknesses[0]).toEqual({ label: 'rushed closings', count: 2, firstSeen: '2026-07-10T00:00:00.000Z', lastSeen: '2026-07-11T00:00:00.000Z' });
    expect(second.totalSessions).toBe(2);
  });

  it('sorts recurring weaknesses by count descending', () => {
    let p = applyOutcomeToProfile(emptyProfile, outcome({ weaknesses: ['a', 'b'] }));
    p = applyOutcomeToProfile(p, outcome({ sessionId: 's2', weaknesses: ['b'] }));
    expect(p.recurringWeaknesses.map((w) => w.label)).toEqual(['b', 'a']);
  });
});

describe('deriveNextFocus', () => {
  it('returns empty string for an empty profile', () => {
    expect(deriveNextFocus(emptyProfile)).toBe('');
  });

  it('prefers the highest-count recurring weakness', () => {
    const p = applyOutcomeToProfile(applyOutcomeToProfile(emptyProfile, outcome({ weaknesses: ['x'] })), outcome({ sessionId: 's2', weaknesses: ['x'] }));
    expect(deriveNextFocus(p)).toBe('x');
  });

  it('falls back to the lowest-average dimension when there are no weaknesses', () => {
    const p = applyOutcomeToProfile(emptyProfile, outcome({ weaknesses: [], dimensions: { clarity: 40, confidence: 90 } }));
    expect(deriveNextFocus(p)).toBe('Work on your clarity.');
  });

  it('applyOutcomeToProfile writes the derived focus onto the profile', () => {
    const p = applyOutcomeToProfile(emptyProfile, outcome({ weaknesses: ['rushed closings'] }));
    expect(p.nextFocus).toBe('rushed closings');
  });
});
