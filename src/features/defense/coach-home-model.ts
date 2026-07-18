import type { DeckContext } from './types';

export type CoachHomeSession = {
  id: string;
  title: string;
  status: string;
  mode: 'diagnostic' | 'mock';
  stance: 'supportive' | 'rigorous';
  deck?: DeckContext;
  finding?: { title: string; evidence: string; drill: string };
  report?: { nextDrill: string; highestLeverage: { title: string; slideIndex: number } };
};

export type CoachHomeModel = {
  nextPractice: { eyebrow: string; title: string; summary: string; actionLabel: string; href: string; duration: string };
  trajectory: { label: string; detail: string; milestone: string };
  programme?: { title: string; sourceName: string; slideCount: number; href: string };
  dailyChallenge: { title: string; target: string; duration: string; available: false };
};

export function buildCoachHomeModel(sessions: CoachHomeSession[]): CoachHomeModel {
  const session = sessions[0];
  const dailyChallenge = { title: 'Explain a difficult decision in 60 seconds', target: 'Clarity and structure', duration: '3 min', available: false as const };

  if (!session?.deck) {
    return {
      nextPractice: { eyebrow: 'Your first programme', title: 'Build your first defense practice plan', summary: 'Import the deck you will defend, then practise against the evidence on every slide.', actionLabel: 'Import your defense deck', href: '/decks/new', duration: '5 min setup' },
      trajectory: { label: 'Your trajectory', detail: 'Your first rehearsal creates a personal baseline for future coaching.', milestone: 'Start with one focused practice.' },
      programme: undefined,
      dailyChallenge,
    };
  }

  const resumeRoom = session.status === 'practicing';
  const focus = session.finding?.title ?? session.report?.nextDrill ?? 'Strengthen your defense explanation';

  return {
    nextPractice: { eyebrow: `Thesis defense - ${resumeRoom ? 'resume' : 'next session'}`, title: focus, summary: session.finding?.drill ?? 'Give a concise explanation before the examiner presses for evidence.', actionLabel: resumeRoom ? 'Resume guided rehearsal' : 'Prepare guided rehearsal', href: `/practice/${session.id}?view=${resumeRoom ? 'room' : 'setup'}`, duration: '12 min' },
    trajectory: { label: 'Your trajectory', detail: sessions.length === 1 ? 'Your first defense programme is ready. One rehearsal will give your coach a useful baseline.' : `${sessions.length} defense sessions are recorded. Consistent repetition makes your explanation more precise.`, milestone: session.report?.nextDrill ?? 'Practise the claim, evidence, and conclusion in order.' },
    programme: { title: session.title, sourceName: session.deck.sourceName, slideCount: session.deck.slides.length, href: `/practice/${session.id}?view=setup` },
    dailyChallenge,
  };
}
