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
