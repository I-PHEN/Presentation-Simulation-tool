import { describe, expect, it } from 'vitest';

import { buildDefenseEvaluationPrompt } from './evaluation';

describe('buildDefenseEvaluationPrompt', () => {
  it('grounds slide-reading feedback in calculated evidence', () => {
    const prompt = buildDefenseEvaluationPrompt({
      title: 'Adaptive tutoring thesis',
      mode: 'mock',
      deckText: 'Methods: randomized controlled trial.',
      transcript: 'Methods: randomized controlled trial.',
      readingEvidence: [
        {
          slideIndex: 3,
          hasSpeech: true,
          overlap: 0.9,
          copiedPhrases: ['randomized controlled trial'],
          explanationSignals: [],
        },
      ],
    });

    expect(prompt).toContain('Do not infer verbatim reading without this evidence.');
    expect(prompt).toContain('0.9');
    expect(prompt).toContain('randomized controlled trial');
  });

  it('requires typed slide, presenter, examiner, gap, and drill evidence', () => {
    const prompt = buildDefenseEvaluationPrompt({ title: 'T', mode: 'mock', deckText: 'Slide 1', transcript: 'Presenter: words', readingEvidence: [] });
    expect(prompt).toContain('quoted presenter source');
    expect(prompt).toContain('valid slide');
    expect(prompt).toContain('camera');
    expect(prompt).toContain('presenterQuote');
    expect(prompt).toContain('slide_reliance');
  });
});
