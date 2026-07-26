import { describe, expect, it } from 'vitest';
import { aggregateDelivery, sawPerson, MIN_DELIVERY_SAMPLES } from './delivery-analysis';
import { isSessionRelativeMs } from './coaching-timeline';
import type { DeliverySample } from './types';

/** A run of usable frames, 20s apart, all scoring the same. */
function frames(count: number, scores: Partial<DeliverySample> = {}, startMs = 0): DeliverySample[] {
  return Array.from({ length: count }, (_, index) => ({
    atMs: startMs + index * 20_000,
    eyeContact: 80, posture: 75, presence: 70,
    ...scores,
  }));
}

describe('sawPerson', () => {
  it('rejects the all-zero frame the vision route returns when nobody is visible', () => {
    expect(sawPerson({ atMs: 0, eyeContact: 0, posture: 0, presence: 0 })).toBe(false);
  });

  it('accepts a frame with any signal at all', () => {
    expect(sawPerson({ atMs: 0, eyeContact: 0, posture: 0, presence: 10 })).toBe(true);
  });
});

describe('aggregateDelivery', () => {
  it('claims nothing when the camera saw too little of the rehearsal', () => {
    expect(aggregateDelivery([])).toBeNull();
    expect(aggregateDelivery(frames(MIN_DELIVERY_SAMPLES - 1))).toBeNull();
    expect(aggregateDelivery(frames(MIN_DELIVERY_SAMPLES))).not.toBeNull();
  });

  it('averages the frames that contained a person', () => {
    const result = aggregateDelivery(frames(10));
    expect(result).toMatchObject({ samples: 10, eyeContact: 80, posture: 75, presence: 70 });
  });

  it('excludes blind frames instead of scoring them as zero', () => {
    // Ten good frames plus ten where the speaker stepped out of shot. Averaging
    // the blind frames in would report ~40 eye contact and slander the speaker.
    const blind = frames(10, { eyeContact: 0, posture: 0, presence: 0 }, 200_000);
    const result = aggregateDelivery([...frames(10), ...blind]);
    expect(result?.samples).toBe(10);
    expect(result?.eyeContact).toBe(80);
  });

  it('reports how much of the session it actually saw', () => {
    // 10 frames, 20s apart: first at 0, last at 180_000.
    expect(aggregateDelivery(frames(10))?.coverageMs).toBe(180_000);
  });

  it('surfaces the worst moments first, capped at three, on the session clock', () => {
    const result = aggregateDelivery([
      ...frames(8),
      { atMs: 300_000, eyeContact: 20, posture: 80, presence: 60 },
      { atMs: 320_000, eyeContact: 44, posture: 80, presence: 60 },
      { atMs: 340_000, eyeContact: 80, posture: 10, presence: 60 },
      { atMs: 360_000, eyeContact: 30, posture: 60, presence: 60 },
    ]);
    expect(result?.lowMoments).toEqual([
      { atMs: 340_000, kind: 'posture' },   // 10, worst
      { atMs: 300_000, kind: 'eyeContact' }, // 20
      { atMs: 360_000, kind: 'eyeContact' }, // 30
    ]);
    for (const moment of result!.lowMoments) expect(isSessionRelativeMs(moment.atMs)).toBe(true);
  });

  it('has no low moments to report from a strong session', () => {
    expect(aggregateDelivery(frames(12))?.lowMoments).toEqual([]);
  });

  it('orders by time before measuring coverage, whatever order frames arrived in', () => {
    const shuffled = [...frames(10)].reverse();
    expect(aggregateDelivery(shuffled)?.coverageMs).toBe(180_000);
  });
});
