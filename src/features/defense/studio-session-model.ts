import type { DeckContext } from './types';

export type StudioSession = {
  id: string;
  title: string;
  createdAt?: string;
  status: string;
  source?: 'deck' | 'topic';
  mode: 'diagnostic' | 'mock';
  stance: 'supportive' | 'rigorous';
  deck?: DeckContext;
  finding?: { title: string; evidence: string; drill: string };
  report?: { nextDrill: string; highestLeverage: { title: string; slideIndex: number } };
  dimensions?: Record<string, number>;
};

export type StudioAction = { label: string; href: string };

export type PracticeRow = { id: string; title: string; status: string; action: StudioAction };

export type TodayModel = {
  empty: boolean;
  primaryAction: StudioAction;
  active?: {
    id: string;
    title: string;
    status: string;
    source: 'deck' | 'topic';
    deck: DeckContext;
    cue?: string;
    coachNote?: string;
    reportHref?: string;
  };
  recent: PracticeRow[];
};

export type ReviewRow = {
  id: string;
  title: string;
  status: string;
  sourceName?: string;
  action: StudioAction;
};

const START_REHEARSING_ACTION: StudioAction = { label: 'Start rehearsing', href: '/decks/new' };

/**
 * The single source of routing truth for every Studio surface: every action
 * this returns resolves to an existing route (`/decks/new`, `/reports/:id`,
 * `/rehearse/:id`, or `/practice/:id?view=setup`), never an invented one.
 *
 * Resuming goes to `/rehearse/:id` — the fit-to-viewport simulator room. The
 * legacy `/practice/:id?view=room` still renders the old scrolling room, so
 * linking there is what put people back in it.
 */
function resolveAction(session: StudioSession): StudioAction {
  if (session.status === 'completed') return { label: 'Open review', href: `/reports/${session.id}` };
  if (session.mode === 'guided' || session.source === 'topic') return { label: 'Resume coaching', href: `/coaching/${session.id}` };
  if (session.deck || session.status === 'practicing') return { label: 'Resume rehearsal', href: `/rehearse/${session.id}` };
  return START_REHEARSING_ACTION;
}

/** Only ever real API data: finding.drill, finding.evidence, or report.nextDrill. Never a placeholder. */
function coachNoteFor(session: StudioSession): string | undefined {
  return session.finding?.drill ?? session.finding?.evidence ?? session.report?.nextDrill;
}

/** Only derivable from a persisted report's slide reference; omitted otherwise rather than guessed. */
function cueFor(session: StudioSession): string | undefined {
  return session.report ? `Slide ${session.report.highestLeverage.slideIndex}` : undefined;
}

export function buildTodayModel(sessions: StudioSession[]): TodayModel {
  const [session, ...rest] = sessions;
  const recent = rest.map((row) => ({ id: row.id, title: row.title, status: row.status, action: resolveAction(row) }));

  if (!session) return { empty: true, primaryAction: START_REHEARSING_ACTION, recent };

  const primaryAction = resolveAction(session);
  if (!session.deck) return { empty: false, primaryAction, recent };

  const isTopic = session.source === 'topic';
  const coachNote = coachNoteFor(session);
  // A slide cue is deck-only; a topic session's synthetic card must not surface one.
  const cue = isTopic ? undefined : cueFor(session);
  const reportHref = session.status === 'completed' ? `/reports/${session.id}` : undefined;

  return {
    empty: false,
    primaryAction,
    active: {
      id: session.id,
      title: session.title,
      status: session.status,
      source: isTopic ? 'topic' : 'deck',
      deck: session.deck,
      ...(cue ? { cue } : {}),
      ...(coachNote ? { coachNote } : {}),
      ...(reportHref ? { reportHref } : {}),
    },
    recent,
  };
}

export function buildReviewRows(sessions: StudioSession[]): ReviewRow[] {
  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    status: session.status,
    ...(session.deck ? { sourceName: session.deck.sourceName } : {}),
    action: resolveAction(session),
  }));
}

