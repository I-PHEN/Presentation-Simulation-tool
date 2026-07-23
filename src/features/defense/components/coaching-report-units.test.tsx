import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MetricsStrip } from './MetricsStrip';
import { EvidenceTimeline } from './EvidenceTimeline';
import { PersonaVerdictCards } from './PersonaVerdictCards';
import { DrillsPanel } from './DrillsPanel';
import type { CoachingMetrics, PersonaVerdict, TimelineMoment } from '@/features/defense/types';

const metrics: CoachingMetrics = { paceWpm: 142, fillerPerMin: 6, verbatimSlides: 2, slideTimes: [{ slideIndex: 4, ms: 190000, atMs: 130000 }], questionsHandled: { handled: 3, total: 5 } };
const timeline: TimelineMoment[] = [
  { atMs: 0, kind: 'presenter', slideIndex: 1, text: 'Opening line' },
  { atMs: 134000, kind: 'question', slideIndex: 4, text: 'Why alpha', personaTitle: 'Professor' },
];
const verdicts: PersonaVerdict[] = [
  { personaId: 'professor', personaTitle: 'Professor', verdictLine: 'You leaned on the slide.', challenges: [{ atMs: 134000, slideIndex: 4, text: 'Why alpha', responded: false }] },
];

describe('MetricsStrip', () => {
  it('shows grounded dimensions with values', () => {
    const html = renderToStaticMarkup(<MetricsStrip metrics={metrics} onSeek={() => undefined} />);
    expect(html).toContain('142');
    expect(html).toContain('Pace');
    expect(html).toContain('Questions handled');
    expect(html).toContain('3 of 5');
  });
  it('renders a dash when a metric is null', () => {
    const html = renderToStaticMarkup(<MetricsStrip metrics={{ ...metrics, paceWpm: null, fillerPerMin: null }} onSeek={() => undefined} />);
    expect(html).toContain('Pace');
  });
});

describe('EvidenceTimeline', () => {
  it('lists moments with mm:ss badges and persona tags', () => {
    const html = renderToStaticMarkup(<EvidenceTimeline timeline={timeline} onSeek={() => undefined} />);
    expect(html).toContain('0:00');
    expect(html).toContain('2:14');
    expect(html).toContain('Professor');
    expect(html).toContain('Opening line');
  });
});

describe('PersonaVerdictCards', () => {
  it('renders a card per persona with its validated line and challenges', () => {
    const html = renderToStaticMarkup(<PersonaVerdictCards verdicts={verdicts} onSeek={() => undefined} />);
    expect(html).toContain('Professor');
    expect(html).toContain('You leaned on the slide.');
    expect(html).toContain('Why alpha');
  });
});

describe('DrillsPanel', () => {
  it('lists drills and a retry link', () => {
    const html = renderToStaticMarkup(<DrillsPanel drills={['Explain why.', 'Rehearse the closing.']} retryHref="/rehearse/s1" />);
    expect(html).toContain('Explain why.');
    expect(html).toContain('Rehearse the closing.');
    expect(html).toContain('href="/rehearse/s1"');
  });
});
