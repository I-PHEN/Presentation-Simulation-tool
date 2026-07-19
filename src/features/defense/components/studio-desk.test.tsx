import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StudioDesk } from './studio-desk';
import type { TodayModel } from '../studio-session-model';

const practicingTodayModel: TodayModel = {
  empty: false,
  primaryAction: { label: 'Resume rehearsal', href: '/practice/defense-1?view=room' },
  active: {
    id: 'defense-1',
    title: 'Final thesis defense',
    status: 'practicing',
    deck: {
      sourceName: 'Final-defense.pptx',
      slides: [
        { index: 1, text: 'Opening claim', imageUrl: '/slides/1.jpg' },
        { index: 2, text: 'Evidence', imageUrl: '/slides/2.jpg' },
        { index: 3, text: 'Methodology', imageUrl: '/slides/3.jpg' },
        { index: 4, text: 'Results', imageUrl: '/slides/4.jpg' },
      ],
    },
    cue: 'Slide 4',
    coachNote: 'Explain the evidence.',
  },
};

const emptyTodayModel: TodayModel = {
  empty: true,
  primaryAction: { label: 'Import deck', href: '/decks/new' },
};

const completedTodayModel: TodayModel = {
  empty: false,
  primaryAction: { label: 'Open review', href: '/reports/defense-2' },
  active: {
    id: 'defense-2',
    title: 'Dissertation defense',
    status: 'completed',
    deck: {
      sourceName: 'Dissertation.pdf',
      slides: [{ index: 1, text: 'Opening', imageUrl: '/slides/1.jpg' }],
    },
    reportHref: '/reports/defense-2',
  },
};

const settingUpTodayModel: TodayModel = {
  empty: false,
  primaryAction: { label: 'Continue setup', href: '/practice/defense-3?view=setup' },
  active: {
    id: 'defense-3',
    title: 'Qualifying exam',
    status: 'upload',
    deck: {
      sourceName: 'Qual.pptx',
      slides: [{ index: 1, text: 'Opening', imageUrl: '/slides/1.jpg' }],
    },
  },
};

const deckLessTodayModel: TodayModel = {
  empty: false,
  primaryAction: { label: 'Import deck', href: '/decks/new' },
};

describe('StudioDesk', () => {
  it('renders an active rehearsal action, deck cue, and only an API-backed coach note', () => {
    const html = renderToStaticMarkup(<StudioDesk model={practicingTodayModel} />);
    expect(html).toContain('Resume rehearsal');
    expect(html).toContain('Slide 4');
    expect(html).toContain('Explain the evidence.');
    expect(html).not.toContain('Daily speaking challenge');
  });

  it('renders import as the only primary action for an empty workspace', () => {
    const html = renderToStaticMarkup(<StudioDesk model={emptyTodayModel} />);
    expect(html).toContain('Import deck');
    expect(html).not.toContain('Overall score');
  });

  it('renders the deck source name, slide count, and a private slide preview when a deck is active', () => {
    const html = renderToStaticMarkup(<StudioDesk model={practicingTodayModel} />);
    expect(html).toContain('Final-defense.pptx');
    expect(html).toContain('4 slides');
    expect(html).toContain('Loading private slide preview');
  });

  it('omits the coach-note region when the model has no coach note', () => {
    const html = renderToStaticMarkup(<StudioDesk model={settingUpTodayModel} />);
    expect(html).not.toContain('Coach note');
  });

  it('renders Open latest review only when the model provides a report link', () => {
    const withReport = renderToStaticMarkup(<StudioDesk model={completedTodayModel} />);
    expect(withReport).toContain('Open latest review');
    expect(withReport).toContain('href="/reports/defense-2"');

    const withoutReport = renderToStaticMarkup(<StudioDesk model={practicingTodayModel} />);
    expect(withoutReport).not.toContain('Open latest review');
  });

  it('omits any deck preview and coach content for a deck-less workspace', () => {
    const html = renderToStaticMarkup(<StudioDesk model={deckLessTodayModel} />);
    expect(html).toContain('Import deck');
    expect(html).not.toContain('Coach note');
    expect(html).not.toContain('Loading private slide preview');
  });
});
