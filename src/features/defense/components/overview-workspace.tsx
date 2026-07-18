import Link from 'next/link';
import { AppShell } from './app-shell';
import type { DeckContext } from '@/features/defense/types';

export function OverviewWorkspace({ activeDeck, latestFinding, onStartHref }: {
  activeDeck?: DeckContext;
  latestFinding?: { title: string; evidence: string; drill: string };
  onStartHref: string;
}): React.ReactElement {
  return <AppShell active="overview"><section className="border-y border-border py-8 sm:py-12"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Defense workbench</p><div className="mt-4 flex flex-col gap-8 border-t border-border pt-6 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Continue preparation</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{activeDeck ? `${activeDeck.sourceName} is ready for a rigorous diagnostic rehearsal.` : 'Bring in the deck you will defend, then rehearse against the evidence on each slide.'}</p></div>{!latestFinding && <Link href={onStartHref} className="inline-flex w-fit border border-foreground bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-85">{activeDeck ? 'Review defense deck' : 'Import a defense deck'}</Link>}</div></section>{latestFinding && <section className="grid border-b border-border py-8 md:grid-cols-2"><div className="border-b border-border pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-8"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Current risk</p><h2 className="mt-3 text-xl font-semibold tracking-tight">{latestFinding.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{latestFinding.evidence}</p></div><div className="pt-6 md:pl-8 md:pt-0"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Next drill</p><p className="mt-3 text-sm leading-6">{latestFinding.drill}</p><Link href={onStartHref} className="mt-5 inline-flex text-sm font-medium underline underline-offset-4">Start the drill</Link></div></section>}</AppShell>;
}
