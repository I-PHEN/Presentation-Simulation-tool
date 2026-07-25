import type { CoachingMetrics } from '@/features/defense/types';
import type { SessionOutcome } from './speaker-profile';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function paceScore(wpm: number): number {
  if (wpm >= 110 && wpm <= 160) return 100;
  if (wpm < 110) return Math.round(clamp(((wpm - 60) / (110 - 60)) * 100, 0, 100));
  return Math.round(clamp(((220 - wpm) / (220 - 160)) * 100, 0, 100));
}

export function dimensionsFromMetrics(metrics: CoachingMetrics): Record<string, number> {
  const dimensions: Record<string, number> = {};
  if (metrics.paceWpm !== null) dimensions.pace = paceScore(metrics.paceWpm);
  if (metrics.fillerPerMin !== null) dimensions.fluency = Math.round(clamp(100 - metrics.fillerPerMin * 6, 0, 100));
  const spoken = metrics.slideTimes.length;
  // ownWords compares spoken words to slide text; a deckless (topic) session has
  // no slides to read from, so it is omitted rather than computed from a synthetic card.
  if (!metrics.deckless && spoken > 0) dimensions.ownWords = Math.round(clamp(100 - (metrics.verbatimSlides / spoken) * 100, 0, 100));
  if (metrics.questionsHandled.total > 0) dimensions.questionHandling = Math.round((metrics.questionsHandled.handled / metrics.questionsHandled.total) * 100);
  return dimensions;
}

export function buildSessionOutcome(input: { sessionId: string; metrics: CoachingMetrics; weaknessLabels: string[]; completedAt: string }): SessionOutcome {
  return { sessionId: input.sessionId, dimensions: dimensionsFromMetrics(input.metrics), weaknesses: input.weaknessLabels, completedAt: input.completedAt };
}

export function hasEvidence(outcome: SessionOutcome): boolean {
  return Object.keys(outcome.dimensions).length > 0 || outcome.weaknesses.length > 0;
}
