import type { DeckContext } from './types';

export type StudioSession = {
  id: string;
  title: string;
  createdAt?: string;
  status: string;
  mode: 'diagnostic' | 'mock';
  stance: 'supportive' | 'rigorous';
  deck?: DeckContext;
  finding?: { title: string; evidence: string; drill: string };
  report?: { nextDrill: string; highestLeverage: { title: string; slideIndex: number } };
};

export type StudioAction = { label: string; href: string };

export type TodayModel = {
  empty: boolean;
  primaryAction: StudioAction;
  active?: {
    id: string;
    title: string;
    status: string;
    deck: DeckContext;
    cue?: string;
    coachNote?: string;
    reportHref?: string;
  };
};

export type PracticeRow = { id: string; title: string; status: string; action: StudioAction };

export type PracticeModel = {
  empty: boolean;
  primaryAction: StudioAction;
  active?: { id: string; title: string; status: string; deck: DeckContext };
  recent: PracticeRow[];
};

export type ReviewRow = {
  id: string;
  title: string;
  status: string;
  sourceName?: string;
  action: StudioAction;
};

const IMPORT_DECK_ACTION: StudioAction = { label: 'Import deck', href: '/decks/new' };

/**
 * The single source of routing truth for every Studio surface: every action
 * this returns resolves to an existing route (`/decks/new`, `/reports/:id`,
 * or `/practice/:id`), never an invented one.
 */
function resolveAction(session: StudioSession): StudioAction {
  if (!session.deck) return IMPORT_DECK_ACTION;
  if (session.status === 'completed') return { label: 'Open review', href: `/reports/${session.id}` };
  if (session.status === 'practicing') return { label: 'Resume rehearsal', href: `/practice/${session.id}?view=room` };
  return { label: 'Continue setup', href: `/practice/${session.id}?view=setup` };
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
  const session = sessions[0];
  if (!session) return { empty: true, primaryAction: IMPORT_DECK_ACTION };

  const primaryAction = resolveAction(session);
  if (!session.deck) return { empty: false, primaryAction };

  const coachNote = coachNoteFor(session);
  const cue = cueFor(session);
  const reportHref = session.status === 'completed' ? `/reports/${session.id}` : undefined;

  return {
    empty: false,
    primaryAction,
    active: {
      id: session.id,
      title: session.title,
      status: session.status,
      deck: session.deck,
      ...(cue ? { cue } : {}),
      ...(coachNote ? { coachNote } : {}),
      ...(reportHref ? { reportHref } : {}),
    },
  };
}

export function buildPracticeModel(sessions: StudioSession[]): PracticeModel {
  const [session, ...rest] = sessions;
  const recent = rest.map((row) => ({ id: row.id, title: row.title, status: row.status, action: resolveAction(row) }));

  if (!session) return { empty: true, primaryAction: IMPORT_DECK_ACTION, recent };

  const primaryAction = resolveAction(session);
  if (!session.deck) return { empty: false, primaryAction, recent };

  return {
    empty: false,
    primaryAction,
    active: { id: session.id, title: session.title, status: session.status, deck: session.deck },
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
