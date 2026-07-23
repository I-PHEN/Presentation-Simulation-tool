import { describe, expect, it } from 'vitest';
import { assembleCoachingReport, validatePersonaVerdictLines } from './coaching-report';
import type { DeckContext, DefenseFinding, ExaminerEvent, TranscriptSegment } from './types';

const deck: DeckContext = { sourceName: 'deck', slides: [{ index: 1, text: 'Alpha', imageUrl: '' }] };
const segments: TranscriptSegment[] = [{ role: 'presenter', slideIndex: 1, text: 'we explain alpha here', startedAtMs: 0, endedAtMs: 30000 }];
const events: ExaminerEvent[] = [{ kind: 'question', text: 'Why?', slideIndex: 1, evidence: 'x', occurredAtMs: 10000, persona: { id: 'professor', title: 'Professor' } }];
const findings: DefenseFinding[] = [{ title: 'Explain alpha', risk: 'high', basis: 'response_explanation', presenterQuote: 'we explain alpha here', evidence: 'no reason', slideIndex: 1, drill: 'Explain why.' }];

describe('validatePersonaVerdictLines', () => {
  it('keeps lines for personas with real events and drops the rest', () => {
    const kept = validatePersonaVerdictLines(events, [{ personaId: 'professor', line: 'You leaned on the slide.' }, { personaId: 'ghost', line: 'Never spoke.' }]);
    expect(kept).toEqual({ professor: 'You leaned on the slide.' });
  });
  it('returns an empty map when there are no raw lines', () => {
    expect(validatePersonaVerdictLines(events, undefined)).toEqual({});
  });
});

describe('assembleCoachingReport', () => {
  it('composes findings, metrics, timeline, and persona verdicts', () => {
    const report = assembleCoachingReport({ deck, transcriptSegments: segments, examinerEvents: events, findings, verdictLines: { professor: 'You leaned on the slide.' }, minimal: false });
    expect(report.highestLeverage.title).toBe('Explain alpha');
    expect(report.drills).toContain('Explain why.');
    expect(report.metrics.paceWpm).toBeGreaterThan(0);
    expect(report.timeline.length).toBeGreaterThan(0);
    expect(report.personaVerdicts[0].verdictLine).toBe('You leaned on the slide.');
    expect(report.minimal).toBe(false);
  });

  it('produces a minimal report (no findings) without throwing', () => {
    const report = assembleCoachingReport({ deck, transcriptSegments: [], examinerEvents: [], findings: [], verdictLines: {}, minimal: true });
    expect(report.minimal).toBe(true);
    expect(report.metrics.paceWpm).toBeNull();
    expect(report.timeline).toEqual([]);
    expect(report.personaVerdicts).toEqual([]);
    expect(report.highestLeverage).toBeDefined();
  });
});
