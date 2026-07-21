import Link from 'next/link';
import type { ReviewRow } from '@/features/defense/studio-session-model';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  upload: 'Setup needed',
  analyzed: 'Ready to rehearse',
  practicing: 'In progress',
  completed: 'Reviewed',
};

/**
 * The Review workspace: an actual chronological session history. Each row's
 * action label/href comes straight from the session model's single routing
 * source of truth, so "Open review" only ever appears for a real report and
 * "Resume"/"Continue setup" only ever point at the real practice route.
 */
export function ReviewWorkspace({ rows }: { rows: ReviewRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 p-10">
        <p className="text-xs font-medium text-muted-foreground">Review</p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight">No rehearsals to review yet</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Finish a rehearsal in Practice and its review will appear here.
        </p>
        <Link href="/practice" className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-fit')}>
          Go to Practice
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
        <p className="text-xs font-medium text-muted-foreground">Review</p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight">Session history</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Every rehearsal you have run, newest first. Open a finished review or step back into one still in progress.
        </p>
      </section>
      <ol className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card p-3 shadow-e1">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium">{row.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {STATUS_LABELS[row.status] ?? row.status}
                {row.sourceName ? ` · ${row.sourceName}` : ''}
              </p>
            </div>
            <Link href={row.action.href} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0')}>
              {row.action.label}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
