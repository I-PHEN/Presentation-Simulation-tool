import { describe, expect, it } from 'vitest';
import { reportFromSummary } from './page';

describe('report page coaching wiring', () => {
  it('parses coaching report summary correctly', () => {
    const validReport = {
      coachingReport: {
        highestLeverage: {
          title: 'Opening Pitch Directness',
          risk: 'high',
          basis: 'slide_reliance',
          presenterQuote: 'We believe our product is good.',
          evidence: 'Presenter spent 45s reading bullet points verbatim.',
          slideIndex: 1,
          drill: 'Practice 15s executive hook without looking at slide.',
        },
        drills: ['Practice 15s executive hook'],
        metrics: {
          paceWpm: 140,
          fillerPerMin: 2,
          verbatimSlides: 1,
          slideTimes: [{ slideIndex: 1, ms: 30000, atMs: 0 }],
          questionsHandled: { handled: 2, total: 2 },
          deckless: false,
          delivery: null,
        },
        timeline: [
          { atMs: 0, kind: 'presenter', slideIndex: 1, text: 'Opening statement' },
        ],
        personaVerdicts: [],
        strengths: ['Great vocal pace'],
        minimal: false,
      },
    };

    const parsed = reportFromSummary(validReport);
    expect(parsed).not.toBeNull();
    expect(parsed?.highestLeverage.title).toBe('Opening Pitch Directness');
    expect(parsed?.metrics.paceWpm).toBe(140);
  });

  it('returns null when report format is invalid', () => {
    const invalidReport = { coachingReport: { invalid: true } };
    expect(reportFromSummary(invalidReport)).toBeNull();
  });
});
