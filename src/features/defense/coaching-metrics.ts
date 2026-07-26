import { computeMetrics } from '@/features/simulator/metrics';
import { analyseReading } from './reading-analysis';
import { spokenBySlide } from './transcript';
import type { CoachingMetrics, DeckContext, DeliveryMetrics, ExaminerEvent, TranscriptSegment } from './types';

export function computeCoachingMetrics({ deck, transcriptSegments, examinerEvents, deckless = false, delivery = null }: { deck: DeckContext; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; deckless?: boolean; delivery?: DeliveryMetrics | null }): CoachingMetrics {
  const speech = computeMetrics(transcriptSegments);
  const hasSpeech = speech.spokenMs > 0;
  const paceWpm = hasSpeech ? speech.wpm : null;
  const fillerPerMin = hasSpeech ? speech.fillerCount / (speech.spokenMs / 60_000) : null;

  const reading = analyseReading(deck.slides, spokenBySlide(transcriptSegments));
  const verbatimSlides = reading.filter((item) => item.hasSpeech && (item.overlap > 0 || item.copiedPhrases.length > 0)).length;

  const presenter = transcriptSegments.filter((segment) => segment.role === 'presenter');
  const bySlide = new Map<number, { ms: number; atMs: number }>();
  for (const segment of presenter) {
    const existing = bySlide.get(segment.slideIndex);
    const ms = Math.max(0, segment.endedAtMs - segment.startedAtMs);
    if (existing) { existing.ms += ms; existing.atMs = Math.min(existing.atMs, segment.startedAtMs); }
    else bySlide.set(segment.slideIndex, { ms, atMs: segment.startedAtMs });
  }
  const slideTimes = [...bySlide.entries()].map(([slideIndex, v]) => ({ slideIndex, ms: v.ms, atMs: v.atMs })).sort((a, b) => a.atMs - b.atMs);

  const handled = examinerEvents.filter((event) => presenter.some((segment) => segment.slideIndex === event.slideIndex && segment.startedAtMs > event.occurredAtMs)).length;
  const questionsHandled = { handled, total: examinerEvents.length };

  return { paceWpm, fillerPerMin, verbatimSlides, slideTimes, questionsHandled, deckless, delivery };
}
