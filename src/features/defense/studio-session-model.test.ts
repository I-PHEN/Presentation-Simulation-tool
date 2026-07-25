import { describe, expect, it } from 'vitest';
import { buildReviewRows, buildTodayModel, type StudioSession } from './studio-session-model';

const deck = {
  sourceName: 'thesis-deck.pdf',
  slides: [{ index: 1, text: 'Opening claim', imageUrl: '/slide-1.png' }],
};

const practicingDeckSession: StudioSession = {
  id: 'session-1',
  title: 'Final thesis defense',
  status: 'practicing',
  mode: 'diagnostic',
  stance: 'rigorous',
  deck,
  finding: {
    title: 'Make the opening claim defendable',
    evidence: 'The claim needs an explicit basis.',
    drill: 'State the evidence before the conclusion.',
  },
};

const completedSession: StudioSession = {
  id: 'session-1',
  title: 'Final thesis defense',
  status: 'completed',
  mode: 'diagnostic',
  stance: 'rigorous',
  deck,
  report: {
    nextDrill: 'Practice the evidence trail out loud.',
    highestLeverage: { title: 'Evidence gap', slideIndex: 4 },
  },
};

const deckOnlySession: StudioSession = {
  id: 'session-2',
  title: 'Dissertation walkthrough',
  status: 'upload',
  mode: 'diagnostic',
  stance: 'supportive',
  deck,
};

const noDeckSession: StudioSession = {
  id: 'session-3',
  title: 'Untitled programme',
  status: 'upload',
  mode: 'diagnostic',
  stance: 'supportive',
};

describe('buildTodayModel', () => {
  it('gives a brand-new student a single start action, no active programme, and no recent list', () => {
    expect(buildTodayModel([])).toEqual({
      empty: true,
      primaryAction: { label: 'Start rehearsing', href: '/decks/new' },
      recent: [],
    });
  });

  it('routes a deck-less session back to setup instead of a broken practice room', () => {
    const model = buildTodayModel([noDeckSession]);
    expect(model.empty).toBe(false);
    expect(model.primaryAction).toEqual({ label: 'Start rehearsing', href: '/decks/new' });
    expect(model.active).toBeUndefined();
  });

  it('lists sessions after the active one as resumable recent rows', () => {
    const model = buildTodayModel([practicingDeckSession, deckOnlySession, noDeckSession]);
    expect(model.active?.id).toBe('session-1');
    expect(model.recent).toEqual([
      { id: 'session-2', title: 'Dissertation walkthrough', status: 'upload', action: { label: 'Continue setup', href: '/practice/session-2?view=setup' } },
      { id: 'session-3', title: 'Untitled programme', status: 'upload', action: { label: 'Start rehearsing', href: '/decks/new' } },
    ]);
  });

  it('routes a not-yet-started deck session to setup', () => {
    const model = buildTodayModel([deckOnlySession]);
    expect(model.primaryAction).toEqual({ label: 'Continue setup', href: '/practice/session-2?view=setup' });
    expect(model.active).toMatchObject({ id: 'session-2', title: 'Dissertation walkthrough', status: 'upload', deck });
  });

  it('routes a practicing deck session to the voice room', () => {
    expect(buildTodayModel([practicingDeckSession]).primaryAction).toEqual({
      label: 'Resume rehearsal',
      href: '/practice/session-1?view=room',
    });
  });

  it('routes a completed session to its existing report and exposes reportHref', () => {
    const model = buildTodayModel([completedSession]);
    expect(model.primaryAction).toEqual({ label: 'Open review', href: '/reports/session-1' });
    expect(model.active?.reportHref).toBe('/reports/session-1');
  });

  it('does not manufacture a coach note when the API supplied no finding or report', () => {
    const model = buildTodayModel([deckOnlySession]);
    expect(model.active).toBeDefined();
    expect(model.active?.coachNote).toBeUndefined();
  });

  it('surfaces the finding drill as the coach note when one exists', () => {
    expect(buildTodayModel([practicingDeckSession]).active?.coachNote).toBe('State the evidence before the conclusion.');
  });

  it('falls back to the report next drill when there is no finding', () => {
    expect(buildTodayModel([completedSession]).active?.coachNote).toBe('Practice the evidence trail out loud.');
  });

  it('derives the slide cue only from real report data, never inventing one', () => {
    expect(buildTodayModel([completedSession]).active?.cue).toBe('Slide 4');
    expect(buildTodayModel([practicingDeckSession]).active?.cue).toBeUndefined();
  });

  it('always treats sessions[0] as the active programme, trusting the API newest-first order', () => {
    const model = buildTodayModel([deckOnlySession, completedSession]);
    expect(model.active?.id).toBe('session-2');
  });

  it('marks a topic session as its source and never derives a slide cue for it', () => {
    const topicSession: StudioSession = {
      id: 'topic-1',
      title: 'Is AI overhyped?',
      status: 'completed',
      source: 'topic',
      mode: 'diagnostic',
      stance: 'rigorous',
      deck: { sourceName: 'Is AI overhyped?', slides: [{ index: 1, text: 'Is AI overhyped?', imageUrl: 'topic' }] },
      report: { nextDrill: 'Give the mechanism.', highestLeverage: { title: 'Support the claim', slideIndex: 1 } },
    };
    const model = buildTodayModel([topicSession]);
    expect(model.active?.source).toBe('topic');
    expect(model.active?.cue).toBeUndefined();
  });
});

describe('buildReviewRows', () => {
  it('returns no rows for a new student', () => {
    expect(buildReviewRows([])).toEqual([]);
  });

  it('routes a completed session to its existing report', () => {
    expect(buildReviewRows([completedSession])[0].action).toEqual({
      label: 'Open review', href: '/reports/session-1',
    });
  });

  it('routes an unfinished session to resume instead of a report that does not exist yet', () => {
    expect(buildReviewRows([practicingDeckSession])[0].action).toEqual({
      label: 'Resume rehearsal', href: '/practice/session-1?view=room',
    });
  });

  it('routes a deck-less row to setup and omits the source name', () => {
    const [row] = buildReviewRows([noDeckSession]);
    expect(row.action).toEqual({ label: 'Start rehearsing', href: '/decks/new' });
    expect(row.sourceName).toBeUndefined();
  });

  it('carries the deck source name when one exists', () => {
    expect(buildReviewRows([deckOnlySession])[0].sourceName).toBe('thesis-deck.pdf');
  });

  it('preserves the API newest-first ordering across multiple sessions', () => {
    const rows = buildReviewRows([completedSession, deckOnlySession, noDeckSession]);
    expect(rows.map((row) => row.id)).toEqual(['session-1', 'session-2', 'session-3']);
  });
});
