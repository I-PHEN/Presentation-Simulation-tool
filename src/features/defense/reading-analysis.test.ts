import { describe, expect, it } from 'vitest';

import { analyseReading, readingScore } from './reading-analysis';

describe('reading analysis', () => {
  it('flags copied slide phrases', () => {
    const [item] = analyseReading(
      [
        {
          index: 1,
          imageUrl: '/1',
          text: 'A randomized controlled trial measured learning gains across 120 students.',
        },
      ],
      { 1: 'A randomized controlled trial measured learning gains across 120 students.' },
    );

    expect(item.overlap).toBeGreaterThan(0.8);
  });

  it('credits an original explanation', () => {
    expect(
      readingScore(
        analyseReading(
          [
            {
              index: 1,
              imageUrl: '/1',
              text: 'A randomized controlled trial measured learning gains across 120 students.',
            },
          ],
          {
            1: 'We split 120 students into two groups to see whether our method helped them learn more.',
          },
        ),
      ),
    ).toBeGreaterThan(75);
  });

  it('reports matching phrases and explanatory connectors', () => {
    const [item] = analyseReading(
      [
        {
          index: 2,
          imageUrl: '/2',
          text: 'The intervention improved retention for students through weekly practice sessions.',
        },
      ],
      {
        2: 'The intervention improved retention for students through practice because repeated sessions reinforce recall in practice.',
      },
    );

    expect(item.copiedPhrases).toContain('intervention improved retention students through');
    expect(item.explanationSignals).toEqual(['because', 'in practice']);
  });

  it('bounds the score when no evidence is available', () => {
    expect(readingScore([])).toBe(100);
  });

  it('does not credit an explanation connector when the slide is being read', () => {
    const evidence = analyseReading(
      [
        {
          index: 3,
          imageUrl: '/3',
          text: 'Weekly practice sessions improved student retention across the whole course.',
        },
      ],
      {
        3: 'Weekly practice sessions improved student retention across the whole course because the results were clear.',
      },
    );

    expect(readingScore(evidence)).toBeLessThanOrEqual(10);
  });

  it('detects exact reading of a short slide', () => {
    const evidence = analyseReading(
      [{ index: 4, imageUrl: '/4', text: 'Retention improved after practice.' }],
      { 4: 'Retention improved after practice.' },
    );

    expect(evidence[0].overlap).toBe(1);
    expect(readingScore(evidence)).toBeLessThanOrEqual(10);
  });

  it('detects a short slide read aloud before extra explanation', () => {
    const evidence = analyseReading(
      [{ index: 7, imageUrl: '/7', text: 'Retention improved after practice.' }],
      { 7: 'Retention improved after practice because repeated exercises reinforce recall.' },
    );

    expect(evidence[0].overlap).toBe(1);
    expect(readingScore(evidence)).toBeLessThanOrEqual(10);
  });

  it('marks blank transcripts and excludes them from the average score', () => {
    const evidence = analyseReading(
      [
        { index: 5, imageUrl: '/5', text: 'Retention improved after practice.' },
        { index: 6, imageUrl: '/6', text: 'Students completed weekly exercises.' },
      ],
      { 5: 'Retention improved after practice.', 6: '   ' },
    );

    expect(evidence[1].hasSpeech).toBe(false);
    expect(readingScore(evidence)).toBeLessThanOrEqual(10);
  });
});
