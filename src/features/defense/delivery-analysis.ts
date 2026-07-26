import type { DeliveryMetrics, DeliverySample } from './types';

/** One frame every 20s while the camera is on. Cost scales with talk length. */
export const DELIVERY_SAMPLE_MS = 20_000;

/**
 * Below this, the camera saw too little of the rehearsal to say anything about
 * it. Eight samples is ~2:40 of coverage at the 20s cadence.
 */
export const MIN_DELIVERY_SAMPLES = 8;

/** Frames scoring at or under this are surfaced as concrete moments to review. */
const LOW_SCORE = 45;
const MAX_LOW_MOMENTS = 3;

/**
 * `/api/analyze-frame` returns all three scores as 0 when it cannot see a
 * person. Averaging those in would report someone who stepped out of shot as
 * having no posture, so they are excluded from the evidence entirely.
 */
export function sawPerson(sample: DeliverySample): boolean {
  return sample.eyeContact > 0 || sample.posture > 0 || sample.presence > 0;
}

const mean = (values: number[]) => Math.round(values.reduce((total, value) => total + value, 0) / values.length);

/**
 * Turns raw frame scores into something a report can stand behind, or `null`
 * when the evidence is too thin to claim anything. `coverageMs` is reported so a
 * session where the camera was on briefly reads as exactly that.
 */
export function aggregateDelivery(samples: DeliverySample[]): DeliveryMetrics | null {
  const seen = samples.filter(sawPerson).sort((a, b) => a.atMs - b.atMs);
  if (seen.length < MIN_DELIVERY_SAMPLES) return null;

  const lowMoments = seen
    .flatMap((sample) => [
      ...(sample.eyeContact <= LOW_SCORE ? [{ atMs: sample.atMs, kind: 'eyeContact' as const, score: sample.eyeContact }] : []),
      ...(sample.posture <= LOW_SCORE ? [{ atMs: sample.atMs, kind: 'posture' as const, score: sample.posture }] : []),
    ])
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_LOW_MOMENTS)
    .map(({ atMs, kind }) => ({ atMs, kind }));

  return {
    samples: seen.length,
    eyeContact: mean(seen.map((sample) => sample.eyeContact)),
    posture: mean(seen.map((sample) => sample.posture)),
    presence: mean(seen.map((sample) => sample.presence)),
    coverageMs: seen[seen.length - 1].atMs - seen[0].atMs,
    lowMoments,
  };
}
