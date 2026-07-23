import { describe, expect, it } from 'vitest';
import { buildPersonaVerdicts } from './persona-verdicts';
import type { ExaminerEvent, TranscriptSegment } from './types';

const segments: TranscriptSegment[] = [
  { role: 'presenter', slideIndex: 4, text: 'my response', startedAtMs: 140000, endedAtMs: 150000 },
];
const events: ExaminerEvent[] = [
  { kind: 'question', text: 'Justify?', slideIndex: 4, evidence: 'x', occurredAtMs: 134000, persona: { id: 'professor', title: 'Professor' } }, // responded (seg after)
  { kind: 'question', text: 'Evidence?', slideIndex: 7, evidence: 'y', occurredAtMs: 200000, persona: { id: 'professor', title: 'Professor' } }, // not responded
  { kind: 'interrupt', text: 'Hold', slideIndex: 1, evidence: 'z', occurredAtMs: 5000 }, // no persona → omitted
];

describe('buildPersonaVerdicts', () => {
  it('groups challenges by persona, marks responded, and attaches validated lines', () => {
    const verdicts = buildPersonaVerdicts({ examinerEvents: events, transcriptSegments: segments, verdictLines: { professor: 'You leaned on the slide.' } });
    expect(verdicts).toHaveLength(1);
    const prof = verdicts[0];
    expect(prof).toMatchObject({ personaId: 'professor', personaTitle: 'Professor', verdictLine: 'You leaned on the slide.' });
    expect(prof.challenges).toHaveLength(2);
    expect(prof.challenges[0]).toMatchObject({ atMs: 134000, slideIndex: 4, text: 'Justify?', responded: true });
    expect(prof.challenges[1]).toMatchObject({ atMs: 200000, slideIndex: 7, text: 'Evidence?', responded: false });
  });

  it('sets verdictLine null when no validated line exists for that persona', () => {
    const verdicts = buildPersonaVerdicts({ examinerEvents: events, transcriptSegments: segments, verdictLines: {} });
    expect(verdicts[0].verdictLine).toBeNull();
  });

  it('omits events that have no persona', () => {
    const verdicts = buildPersonaVerdicts({ examinerEvents: events, transcriptSegments: segments, verdictLines: {} });
    expect(verdicts.every((v) => v.personaId !== undefined && v.personaId !== '')).toBe(true);
    expect(verdicts.flatMap((v) => v.challenges).some((c) => c.text === 'Hold')).toBe(false);
  });
});
