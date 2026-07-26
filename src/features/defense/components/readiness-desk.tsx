import Link from 'next/link';

interface LatestSession {
  title: string;
  readiness: number;
  audience: string;
  date: string;
}

interface ReadinessDeskProps {
  userName: string;
  latestSession?: LatestSession;
}

export function ReadinessDesk({ userName, latestSession }: ReadinessDeskProps) {
  const deckTitle = latestSession?.title || 'Your thesis deck';
  const readiness = latestSession?.readiness ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.75fr)]">
      <section className="flex min-h-[25rem] flex-col justify-between bg-[#15262D] p-7 text-[#F6F7F3] sm:p-10">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ECA47E]">Next rehearsal</p>
          <h2 className="defense-title mt-7 max-w-xl text-5xl leading-[0.94] sm:text-6xl">
            Defend your<br />evaluation<br />baseline.
          </h2>
          <p className="mt-7 max-w-md text-sm leading-6 text-[#C4CFCA]">
            {latestSession
              ? `Your latest ${latestSession.audience} session left the comparison method unclear. Practice one focused answer before your full mock defense.`
              : 'Upload your deck and build a clear explanation before your first mock defense.'}
          </p>
        </div>
        <Link href="/practice" className="mt-10 inline-flex min-h-11 w-fit items-center bg-[#B94C2C] px-5 text-sm font-bold text-white transition-colors hover:bg-[#D0603D] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ECA47E]">
          Begin focused practice <span aria-hidden="true" className="ml-2">→</span>
        </Link>
      </section>

      <aside className="glass-card rounded-2xl p-6 sm:p-7 shadow-lg">
        <p className="defense-kicker">Rehearsal record</p>
        <h2 className="defense-title mt-3 text-3xl">What needs attention</h2>
        <dl className="mt-6 divide-y divide-border border-y border-border">
          <div className="py-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Highest-risk defense question</dt>
            <dd className="mt-2 text-sm font-semibold">Why did you choose this baseline?</dd>
            <dd className="mt-1 text-xs text-muted-foreground">Methodology · rehearse a 30-second answer</dd>
          </div>
          <div className="py-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Latest mock defense</dt>
            <dd className="mt-2 text-sm font-semibold">{readiness === null ? 'Not measured yet' : `${readiness} / ready`}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">{latestSession?.date || 'Run your first defense simulation'}</dd>
          </div>
          <div className="py-4">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Deck in focus</dt>
            <dd className="mt-2 truncate text-sm font-semibold">{deckTitle}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">{userName}&apos;s preparation record</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
