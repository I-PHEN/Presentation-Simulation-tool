import Link from 'next/link';
import type { PracticeModel } from '@/features/defense/studio-session-model';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  upload: 'Setup needed',
  analyzed: 'Ready to rehearse',
  practicing: 'In progress',
  completed: 'Reviewed',
};

const STATUS_DOT: Record<string, string> = {
  upload: 'bg-warning',
  analyzed: 'bg-primary',
  practicing: 'bg-primary',
  completed: 'bg-success',
};

/**
 * The Practice workspace: one active-programme row (the same routing truth
 * as Today, phrased for a working session) plus a compact list of the rest.
 * Every link comes straight from the model - there is no mode selector and
 * no generic "practice more" filler, only real programmes and real routes.
 */
export function PracticeHub({ model }: { model: PracticeModel }) {
  const { active, recent } = model;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6 shadow-e1" aria-labelledby="practice-heading">
        <p className="text-xs font-medium text-muted-foreground">{active ? 'Active programme' : 'Practice'}</p>
        <h1 id="practice-heading" className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight">
          {active?.title ?? 'Start your first rehearsal programme'}
        </h1>
        {active && (
          <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className={cn('size-1.5 rounded-full', STATUS_DOT[active.status] ?? 'bg-primary')} aria-hidden="true" />
            {STATUS_LABELS[active.status] ?? active.status}
          </span>
        )}
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {active
            ? `${active.deck.sourceName} is queued for your next working session.`
            : 'Import the deck you will defend to open your first practice programme.'}
        </p>
        <Link href={model.primaryAction.href} className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-fit')}>
          {model.primaryAction.label}
        </Link>
      </section>

      {recent.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-3 shadow-e1" aria-labelledby="recent-sessions-heading">
          <p id="recent-sessions-heading" className="px-3 pt-2 text-xs font-medium text-muted-foreground">
            Recent sessions
          </p>
          <ul className="mt-1 divide-y divide-border">
            {recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-surface">
                <div>
                  <p className="text-sm font-medium">{row.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{STATUS_LABELS[row.status] ?? row.status}</p>
                </div>
                <Link href={row.action.href} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0')}>
                  {row.action.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
