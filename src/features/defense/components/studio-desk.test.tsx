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
    source: 'deck',
    deck: {
      sourceName: 'Final-defense.pptx',
      slides: [
        { index: 1, text: 'Opening claim', imageUrl: '/slides/1.jpg' },
        { index: 2, text: 'Evidence', imageUrl: '/slides/2.jpg' },
      ],
    },
    cue: 'Slide 2',
    coachNote: 'Explain the evidence.',
  },
  recent: [],
};

const emptyTodayModel: TodayModel = {
  empty: true,
  primaryAction: { label: 'Start rehearsing', href: '/decks/new' },
  recent: [],
};

const completedTodayModel: TodayModel = {
  empty: false,
  primaryAction: { label: 'Open review', href: '/reports/defense-2' },
  active: {
    id: 'defense-2',
    title: 'Dissertation defense',
    status: 'completed',
    source: 'deck',
    deck: { sourceName: 'Dissertation.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: '/slides/1.jpg' }] },
    reportHref: '/reports/defense-2',
  },
  recent: [],
};

const settingUpTodayModel: TodayModel = {
  empty: false,
  primaryAction: { label: 'Continue setup', href: '/practice/defense-3?view=setup' },
  active: {
    id: 'defense-3',
    title: 'Qualifying exam',
    status: 'upload',
    source: 'deck',
    deck: { sourceName: 'Qual.pptx', slides: [{ index: 1, text: 'Opening', imageUrl: '/slides/1.jpg' }] },
  },
  recent: [],
};

const topicTodayModel: TodayModel = {
  empty: false,
  primaryAction: { label: 'Resume rehearsal', href: '/practice/topic-1?view=room' },
  active: {
    id: 'topic-1',
    title: 'Is AI overhyped?',
    status: 'practicing',
    source: 'topic',
    deck: { sourceName: 'Is AI overhyped?', slides: [{ index: 1, text: 'Is AI overhyped?', imageUrl: 'topic' }] },
  },
  recent: [],
};

describe('StudioDesk continue hero', () => {
  it('renders one focused continue card with title, status, primary action, and a deck preview', () => {
    const html = renderToStaticMarkup(<StudioDesk model={practicingTodayModel} />);
    expect(html).toContain('Continue');
    expect(html).toContain('Final thesis defense');
    expect(html).toContain('In progress');
    expect(html).toContain('Resume rehearsal');
    expect(html).toContain('Loading private slide preview'); // real deck thumbnail
    expect(html).not.toContain('Daily speaking challenge');
    expect(html).not.toContain('Deck in play');
  });

  it('uses the session drill as the focus line, and lets a longitudinal focus override it', () => {
    const withoutFocus = renderToStaticMarkup(<StudioDesk model={practicingTodayModel} />);
    expect(withoutFocus).toContain('Explain the evidence.');

    const withFocus = renderToStaticMarkup(<StudioDesk model={practicingTodayModel} focus="Sharpen your framing" />);
    expect(withFocus).toContain('Sharpen your framing');
    expect(withFocus).not.toContain('Explain the evidence.');
  });

  it('shows the get-started hero and the source-neutral action for an empty workspace', () => {
    const html = renderToStaticMarkup(<StudioDesk model={emptyTodayModel} />);
    expect(html).toContain('Start your first rehearsal');
    expect(html).toContain('Start rehearsing');
    expect(html).not.toContain('Loading private slide preview');
  });

  it('never fabricates a focus line when there is no drill or focus', () => {
    const html = renderToStaticMarkup(<StudioDesk model={settingUpTodayModel} />);
    expect(html).not.toContain('Focus:');
    expect(html).not.toContain('Your coach will leave a note here');
  });

  it('routes a completed session to its report', () => {
    const html = renderToStaticMarkup(<StudioDesk model={completedTodayModel} />);
    expect(html).toContain('Open review');
    expect(html).toContain('href="/reports/defense-2"');
  });

  it('frames a topic session without a slide preview or deck chrome', () => {
    const html = renderToStaticMarkup(<StudioDesk model={topicTodayModel} />);
    expect(html).toContain('Topic session');
    expect(html).toContain('Is AI overhyped?');
    expect(html).not.toContain('Loading private slide preview');
    expect(html).not.toContain('Deck in play');
  });
});
