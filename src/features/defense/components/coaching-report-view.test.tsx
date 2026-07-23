import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CoachingReportView } from './coaching-report';
import type { CoachingReport } from '@/features/defense/types';

const report: CoachingReport = {
  highestLeverage: { title: 'Explain the result', risk: 'high', basis: 'response_explanation', presenterQuote: 'the model converged', evidence: 'no reason given', slideIndex: 1, drill: 'Explain why.' },
  drills: ['Explain why.'],
  metrics: { paceWpm: 142, fillerPerMin: 6, verbatimSlides: 2, slideTimes: [{ slideIndex: 1, ms: 60000, atMs: 0 }], questionsHandled: { handled: 3, total: 5 } },
  timeline: [{ atMs: 0, kind: 'presenter', slideIndex: 1, text: 'Opening' }],
  personaVerdicts: [{ personaId: 'professor', personaTitle: 'Professor', verdictLine: 'You leaned on the slide.', challenges: [{ atMs: 0, slideIndex: 1, text: 'Why?', responded: true }] }],
  strengths: ['Clear scope'],
  minimal: false,
};

describe('CoachingReportView', () => {
  it('renders the headline, the sections, and the audio player', () => {
    const html = renderToStaticMarkup(<CoachingReportView report={report} audioPath="/recordings/s1.webm" retryHref="/rehearse/s1" />);
    expect(html).toContain('Explain the result');
    expect(html).toContain('How you delivered');
    expect(html).toContain('Timeline of moments');
    expect(html).toContain('What the panel pressed on');
    expect(html).toContain('Your next drills');
    expect(html).toContain('Session recording');
    expect(html).toContain('<h1');
  });

  it('renders the empty-recording state when there is no audio', () => {
    const html = renderToStaticMarkup(<CoachingReportView report={report} audioPath={null} retryHref="/rehearse/s1" />);
    expect(html).toContain('No recording was captured for this session.');
  });
});
