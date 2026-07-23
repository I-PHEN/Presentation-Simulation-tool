import { describe, expect, it } from 'vitest';
import { coachingReportSchema } from './types';

const valid = {
  highestLeverage: { title: 'Explain the result', risk: 'high', basis: 'response_explanation', presenterQuote: 'the model converged', evidence: 'no reason given', slideIndex: 1, drill: 'Explain why.' },
  drills: ['Explain why.'],
  metrics: { paceWpm: 142, fillerPerMin: 6, verbatimSlides: 2, slideTimes: [{ slideIndex: 1, ms: 60000, atMs: 0 }], questionsHandled: { handled: 3, total: 5 } },
  timeline: [{ atMs: 0, kind: 'presenter', slideIndex: 1, text: 'Hello' }, { atMs: 134000, kind: 'question', slideIndex: 4, text: 'Why?', personaTitle: 'Professor' }],
  personaVerdicts: [{ personaId: 'professor', personaTitle: 'Professor', challenges: [{ atMs: 134000, slideIndex: 4, text: 'Why?', responded: false }], verdictLine: 'You leaned on the slide text.' }],
  strengths: ['Clear scope'],
  minimal: false,
};

describe('coachingReportSchema', () => {
  it('accepts a fully-populated coaching report', () => {
    expect(coachingReportSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a minimal report with null metrics and null verdict lines', () => {
    const minimal = { ...valid, minimal: true, metrics: { ...valid.metrics, paceWpm: null, fillerPerMin: null }, personaVerdicts: [{ ...valid.personaVerdicts[0], verdictLine: null }] };
    expect(coachingReportSchema.safeParse(minimal).success).toBe(true);
  });

  it('rejects a report missing the metrics block', () => {
    const { metrics, ...broken } = valid;
    expect(coachingReportSchema.safeParse(broken).success).toBe(false);
  });
});
