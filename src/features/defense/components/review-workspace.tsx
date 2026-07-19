import Link from 'next/link';
import type { ReviewRow } from '@/features/defense/studio-session-model';

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
      <div className="border-y border-border py-10 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Review</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">No rehearsals to review yet</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Finish a rehearsal in Practice and its review will appear here.
        </p>
        <Link
          href="/practice"
          className="mt-6 inline-flex w-fit items-center justify-center bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go to Practice
        </Link>
      </div>
    );
  }

  return (
    <div className="border-y border-border py-10 sm:py-14">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Review</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Session history</h1>
      <ol className="mt-6 divide-y divide-border border-t border-border">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">{row.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {STATUS_LABELS[row.status] ?? row.status}
                {row.sourceName ? ` · ${row.sourceName}` : ''}
              </p>
            </div>
            <Link href={row.action.href} className="shrink-0 text-sm font-medium underline underline-offset-4">
              {row.action.label}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
