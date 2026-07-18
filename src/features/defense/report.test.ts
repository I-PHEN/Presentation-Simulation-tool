import { describe, expect, it } from 'vitest';
import { buildDefenseReport } from './report';
import { defenseReportSchema } from './types';

const deck = { sourceName: 'thesis.pdf', slides: [{ index: 1, text: 'Retention increased after the onboarding redesign.', imageUrl: 'one.png' }] };
const transcriptSegments = [
  { role: 'presenter' as const, slideIndex: 1, text: 'Retention increased after the onboarding redesign.', startedAtMs: 0, endedAtMs: 5 },
  { role: 'examiner' as const, slideIndex: 1, text: 'How do you know that effect was causal?', startedAtMs: 6, endedAtMs: 8 },
];

describe('buildDefenseReport', () => {
  it('traces a reading finding to actual presenter speech, slide, event, and a retry drill', () => {
    const report = buildDefenseReport({ deck, transcriptSegments, examinerEvents: [{ kind: 'question', text: 'How do you know that effect was causal?', evidence: 'Asked after the claim.', slideIndex: 1, occurredAtMs: 6 }], findings: [{ title: 'Explain the result', risk: 'high', basis: 'slide_reliance', presenterQuote: transcriptSegments[0].text, evidence: 'You repeated the slide claim.', slideIndex: 1, drill: 'Explain the result without reading the slide.' }] });
    expect(report.evidenceTrail[0]).toMatchObject({ slideIndex: 1, slideClaim: deck.slides[0].text, presenterSpeech: transcriptSegments[0].text, examinerEvent: 'How do you know that effect was causal?' });
    expect(report.nextDrill).toMatch(/without reading/i);
  });

  it('does not penalize missing presenter speech or use examiner text as speech evidence', () => {
    const report = buildDefenseReport({ deck, transcriptSegments: [{ ...transcriptSegments[1] }], examinerEvents: [], findings: [] });
    expect(report.slideReliance).toMatchObject({ available: false });
    expect(report.evidenceTrail[0].presenterSpeech).toMatch(/unavailable/i);
  });

  it('rejects shallow cached report objects that lack reliance or strengths', () => {
    expect(defenseReportSchema.safeParse({ highestLeverage: {}, evidenceTrail: [], nextDrill: 'Retry' }).success).toBe(false);
  });
});
