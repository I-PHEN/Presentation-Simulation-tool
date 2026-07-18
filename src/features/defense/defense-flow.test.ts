import { describe, expect, it } from 'vitest';
import { buildDefenseReport } from './report';

describe('defense flow contract', () => {
  it('keeps a typed deck grounded through a session, rehearsal evidence, and report drill', () => {
    const deck = {
      sourceName: 'Causal inference thesis.pdf',
      slides: [
        { index: 1, text: 'We introduce the research question.', imageUrl: 'slide-1.png' },
        { index: 2, text: 'The intervention improved retention by 14%.', imageUrl: 'slide-2.png' },
      ],
    };
    const session = { id: 'defense-1', title: deck.sourceName, mode: 'mock' as const, stance: 'rigorous' as const, deck };
    const presenterSegments = [{ role: 'presenter' as const, slideIndex: 2, text: 'The intervention improved retention by 14%, and the control group did not change.', startedAtMs: 2_000, endedAtMs: 8_000 }];
    const examinerSegments = [{ role: 'examiner' as const, slideIndex: 2, text: 'What rules out selection bias?', startedAtMs: 8_100, endedAtMs: 10_000 }];

    const report = buildDefenseReport({
      deck: session.deck,
      transcriptSegments: [...presenterSegments, ...examinerSegments],
      examinerEvents: [{ kind: 'question', text: examinerSegments[0].text, slideIndex: 2, evidence: 'The causal claim needs support.', occurredAtMs: 8_100 }],
      findings: [{ title: 'Defend the causal claim', risk: 'high', basis: 'response_explanation', presenterQuote: presenterSegments[0].text, evidence: 'The control comparison was asserted but not explained.', slideIndex: 2, drill: 'Explain how the control group rules out selection bias.' }],
    });

    expect(session.mode).toBe('mock');
    expect(session.stance).toBe('rigorous');
    expect(report.highestLeverage.slideIndex).toBe(2);
    expect(report.evidenceTrail[0]).toMatchObject({ slideIndex: 2, slideClaim: deck.slides[1].text, presenterSpeech: presenterSegments[0].text, examinerEvent: examinerSegments[0].text });
    expect(report.nextDrill).not.toHaveLength(0);
  });
});
