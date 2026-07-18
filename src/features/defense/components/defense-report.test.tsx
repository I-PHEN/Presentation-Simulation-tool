import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DefenseReportView } from './defense-report';

it('uses evidence-led language rather than generic scoring UI', () => {
  const markup = renderToStaticMarkup(<DefenseReportView report={{ highestLeverage: { title: 'Explain the result', risk: 'high', evidence: 'Repeat', slideIndex: 1, drill: 'Explain without reading.' }, evidenceTrail: [{ slideIndex: 1, slideClaim: 'Claim', presenterSpeech: 'What I said', examinerEvent: 'Why?', responseGap: 'Gap', drill: 'Explain without reading.' }], strengths: ['Clear scope'], slideReliance: { available: true, summary: 'Evidence shows copied phrasing on one slide.', evidence: [] }, nextDrill: 'Explain without reading.' }} />);
  expect(markup).toContain('Slide reliance');
  expect(markup).toContain('What you said');
  expect(markup).not.toContain('verbatimReading');
  expect(markup).not.toContain('camera');
  expect(markup).not.toContain('judge');
});
