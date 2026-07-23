import { describe, expect, it } from 'vitest';
import { computeCoachingMetrics } from './coaching-metrics';
import type { DeckContext, ExaminerEvent, TranscriptSegment } from './types';

const deck: DeckContext = { sourceName: 'deck', slides: [{ index: 1, text: 'Alpha claim', imageUrl: '' }, { index: 2, text: 'Beta claim', imageUrl: '' }] };

const transcript: TranscriptSegment[] = [
  { role: 'presenter', slideIndex: 1, text: 'we explain the alpha result in our own words here', startedAtMs: 0, endedAtMs: 30000 },
  { role: 'presenter', slideIndex: 2, text: 'and then we respond after the question', startedAtMs: 60000, endedAtMs: 90000 },
];
const events: ExaminerEvent[] = [
  { kind: 'question', text: 'Why alpha?', slideIndex: 2, evidence: 'x', occurredAtMs: 45000, persona: { id: 'professor', title: 'Professor' } }, // handled (later seg on slide 2 at 60000)
  { kind: 'question', text: 'Unanswered?', slideIndex: 1, evidence: 'y', occurredAtMs: 50000, persona: { id: 'examiner', title: 'Examiner' } }, // NOT handled (no slide-1 presenter seg after 50000)
];

describe('computeCoachingMetrics', () => {
  it('computes pace, fillers, verbatim, slide times, and questions handled from capture', () => {
    const m = computeCoachingMetrics({ deck, transcriptSegments: transcript, examinerEvents: events });
    expect(m.paceWpm).toBeGreaterThan(0);
    expect(m.fillerPerMin).not.toBeNull();
    expect(m.questionsHandled).toEqual({ handled: 1, total: 2 });
    expect(m.slideTimes.find((s) => s.slideIndex === 1)).toEqual({ slideIndex: 1, ms: 30000, atMs: 0 });
    expect(m.slideTimes.find((s) => s.slideIndex === 2)).toEqual({ slideIndex: 2, ms: 30000, atMs: 60000 });
    expect(m.verbatimSlides).toBeGreaterThanOrEqual(0);
  });

  it('returns null pace and fillers when there is no presenter speech', () => {
    const m = computeCoachingMetrics({ deck, transcriptSegments: [], examinerEvents: [] });
    expect(m.paceWpm).toBeNull();
    expect(m.fillerPerMin).toBeNull();
    expect(m.slideTimes).toEqual([]);
    expect(m.questionsHandled).toEqual({ handled: 0, total: 0 });
  });
});
