import { describe, expect, it } from 'vitest';
import { buildTimeline, formatTimestamp } from './coaching-timeline';
import type { ExaminerEvent, TranscriptSegment } from './types';

describe('formatTimestamp', () => {
  it('formats milliseconds as m:ss', () => {
    expect(formatTimestamp(0)).toBe('0:00');
    expect(formatTimestamp(5000)).toBe('0:05');
    expect(formatTimestamp(134000)).toBe('2:14');
    expect(formatTimestamp(605000)).toBe('10:05');
  });
});

describe('buildTimeline', () => {
  it('merges presenter speech and panel events in chronological order with persona tags', () => {
    const segments: TranscriptSegment[] = [
      { role: 'presenter', slideIndex: 1, text: 'Opening line', startedAtMs: 0, endedAtMs: 5000 },
      { role: 'presenter', slideIndex: 4, text: 'Later line', startedAtMs: 140000, endedAtMs: 150000 },
    ];
    const events: ExaminerEvent[] = [
      { kind: 'question', text: 'Why?', slideIndex: 4, evidence: 'x', occurredAtMs: 134000, persona: { id: 'professor', title: 'Professor' } },
    ];
    const timeline = buildTimeline({ transcriptSegments: segments, examinerEvents: events });
    expect(timeline.map((m) => m.atMs)).toEqual([0, 134000, 140000]);
    expect(timeline[0]).toMatchObject({ kind: 'presenter', slideIndex: 1, text: 'Opening line' });
    expect(timeline[1]).toMatchObject({ kind: 'question', slideIndex: 4, text: 'Why?', personaTitle: 'Professor' });
    expect(timeline[1].personaTitle).toBe('Professor');
  });

  it('omits empty presenter segments and keeps persona-less events (no tag)', () => {
    const segments: TranscriptSegment[] = [{ role: 'presenter', slideIndex: 1, text: '   ', startedAtMs: 0, endedAtMs: 1000 }];
    const events: ExaminerEvent[] = [{ kind: 'interrupt', text: 'Hold on', slideIndex: 1, evidence: 'x', occurredAtMs: 2000 }];
    const timeline = buildTimeline({ transcriptSegments: segments, examinerEvents: events });
    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({ kind: 'interrupt', text: 'Hold on' });
    expect(timeline[0].personaTitle).toBeUndefined();
  });
});
