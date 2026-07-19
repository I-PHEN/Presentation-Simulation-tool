import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PracticeHub } from './practice-hub';
import type { PracticeModel } from '../studio-session-model';

const practicingPracticeModel: PracticeModel = {
  empty: false,
  primaryAction: { label: 'Resume rehearsal', href: '/practice/session-1?view=room' },
  active: {
    id: 'session-1',
    title: 'Final thesis defense',
    status: 'practicing',
    deck: {
      sourceName: 'Final-defense.pptx',
      slides: [{ index: 1, text: 'Opening claim', imageUrl: '/slides/1.jpg' }],
    },
  },
  recent: [
    { id: 'session-2', title: 'Dissertation walkthrough', status: 'upload', action: { label: 'Continue setup', href: '/practice/session-2?view=setup' } },
    { id: 'session-3', title: 'Untitled programme', status: 'upload', action: { label: 'Import deck', href: '/decks/new' } },
  ],
};

const emptyPracticeModel: PracticeModel = {
  empty: true,
  primaryAction: { label: 'Import deck', href: '/decks/new' },
  recent: [],
};

const deckLessPracticeModel: PracticeModel = {
  empty: false,
  primaryAction: { label: 'Import deck', href: '/decks/new' },
  recent: [],
};

describe('PracticeHub', () => {
  it('makes a practicing programme resumable from Practice', () => {
    const html = renderToStaticMarkup(<PracticeHub model={practicingPracticeModel} />);
    expect(html).toContain('Resume rehearsal');
    expect(html).toContain('href="/practice/session-1?view=room"');
  });

  it('uses deck intake as the real first-programme action', () => {
    const html = renderToStaticMarkup(<PracticeHub model={emptyPracticeModel} />);
    expect(html).toContain('href="/decks/new"');
    expect(html).toContain('Import deck');
  });

  it('renders a compact recent-session list with each session\'s own action link', () => {
    const html = renderToStaticMarkup(<PracticeHub model={practicingPracticeModel} />);
    expect(html).toContain('Dissertation walkthrough');
    expect(html).toContain('href="/practice/session-2?view=setup"');
    expect(html).toContain('Untitled programme');
    expect(html).toContain('Continue setup');
  });

  it('omits the recent-session list entirely when there are no other sessions', () => {
    const html = renderToStaticMarkup(<PracticeHub model={emptyPracticeModel} />);
    expect(html).not.toContain('Recent sessions');
  });

  it('falls back to the import action for a deck-less newest session without inventing an active row', () => {
    const html = renderToStaticMarkup(<PracticeHub model={deckLessPracticeModel} />);
    expect(html).toContain('Start your first rehearsal programme');
    expect(html).toContain('href="/decks/new"');
  });

  it('never renders a mode selector or generic practice-more prose', () => {
    const html = renderToStaticMarkup(<PracticeHub model={practicingPracticeModel} />);
    expect(html).not.toMatch(/diagnostic|mock exam|Practice more|Choose a mode/i);
  });
});
