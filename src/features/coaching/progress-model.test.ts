import { describe, expect, it } from 'vitest';
import { buildProgressModel } from './progress-model';
import { emptyProfile, type SpeakerProfileData } from './speaker-profile';

const profile: SpeakerProfileData = {
  recurringWeaknesses: [{ label: 'Rushing closings', count: 3, firstSeen: '2026-07-20T00:00:00.000Z', lastSeen: '2026-07-23T00:00:00.000Z' }],
  dimensionBaselines: { fluency: { average: 70, samples: 3 } },
  totalSessions: 3, streak: 0, nextFocus: 'Rushing closings',
};
// sessions arrive newest-first (as /api/sessions returns them)
const sessions = [
  { id: 'c', title: 'Third', createdAt: '2026-07-23T00:00:00.000Z', status: 'completed', dimensions: { fluency: 84, pace: 90 } },
  { id: 'b', title: 'Second', createdAt: '2026-07-22T00:00:00.000Z', status: 'completed', dimensions: { fluency: 70, pace: 92 } },
  { id: 'a', title: 'First', createdAt: '2026-07-20T00:00:00.000Z', status: 'completed', dimensions: { fluency: 60, pace: 91 } },
];

describe('buildProgressModel', () => {
  it('builds chronological per-dimension series with a delta and history newest-first', () => {
    const model = buildProgressModel(profile, sessions);
    expect(model.totalSessions).toBe(3);
    expect(model.nextFocus).toBe('Rushing closings');
    const fluency = model.series.find((s) => s.dimension === 'fluency')!;
    expect(fluency.points.map((p) => p.value)).toEqual([60, 70, 84]); // oldest -> newest
    expect(fluency.delta).toBe('up');
    const pace = model.series.find((s) => s.dimension === 'pace')!;
    expect(pace.delta).toBe('steady'); // 91 -> 90 within deadband
    expect(model.recurringWeaknesses[0]).toMatchObject({ label: 'Rushing closings', count: 3 });
    expect(model.history.map((h) => h.id)).toEqual(['c', 'b', 'a']);
    expect(model.history[0].href).toBe('/reports/c');
  });

  it('returns an empty model when there are no completed sessions', () => {
    const model = buildProgressModel(emptyProfile, []);
    expect(model.series).toEqual([]);
    expect(model.history).toEqual([]);
    expect(model.totalSessions).toBe(0);
  });
});
