import Link from 'next/link';
import type { PracticeRow } from '@/features/defense/studio-session-model';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RemoveSessionButton } from './remove-session-button';

const STATUS_LABELS: Record<string, string> = {
  upload: 'Setup needed',
  analyzed: 'Ready to rehearse',
  practicing: 'In progress',
  completed: 'Reviewed',
};

/** A compact list of resumable earlier sessions. Renders nothing when there are none. */
export function RecentSessionsCard({ recent, onRemove }: { recent: PracticeRow[]; onRemove?: (id: string) => void }) {
  if (recent.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-3" aria-labelledby="recent-sessions-heading">
      <p id="recent-sessions-heading" className="px-3 pt-2 text-xs font-medium text-muted-foreground">
        Recent sessions
      </p>
      <ul className="mt-1 divide-y divide-border">
        {recent.slice(0, 4).map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{STATUS_LABELS[row.status] ?? row.status}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Link href={row.action.href} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                {row.action.label}
              </Link>
              {onRemove && <RemoveSessionButton title={row.title} onConfirm={() => onRemove(row.id)} />}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
