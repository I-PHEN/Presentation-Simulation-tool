import Link from 'next/link';
import type { PracticeModel } from '@/features/defense/studio-session-model';

const STATUS_LABELS: Record<string, string> = {
  upload: 'Setup needed',
  analyzed: 'Ready to rehearse',
  practicing: 'In progress',
  completed: 'Reviewed',
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
    <div className="border-y border-border">
      <section className="py-10 sm:py-14" aria-labelledby="practice-heading">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {active ? 'Active programme' : 'Practice'}
        </p>
        <h1 id="practice-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {active?.title ?? 'Start your first rehearsal programme'}
        </h1>
        {active && (
          <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {STATUS_LABELS[active.status] ?? active.status}
          </span>
        )}
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {active
            ? `${active.deck.sourceName} is queued for your next working session.`
            : 'Import the deck you will defend to open your first practice programme.'}
        </p>
        <Link
          href={model.primaryAction.href}
          className="mt-6 inline-flex w-fit items-center justify-center bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {model.primaryAction.label}
        </Link>
      </section>

      {recent.length > 0 && (
        <section className="border-t border-border py-7" aria-labelledby="recent-sessions-heading">
          <p id="recent-sessions-heading" className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Recent sessions
          </p>
          <ul className="mt-4 divide-y divide-border">
            {recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium">{row.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{STATUS_LABELS[row.status] ?? row.status}</p>
                </div>
                <Link href={row.action.href} className="shrink-0 text-sm font-medium underline underline-offset-4">
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
