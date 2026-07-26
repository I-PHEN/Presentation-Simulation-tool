import Link from 'next/link';
import type { ProgressModel } from '@/features/coaching/progress-model';
import { DimensionSparkline } from './dimension-sparkline';
import { RemoveSessionButton } from './remove-session-button';

export function ProgressWorkspace({ model, onRemove }: { model: ProgressModel; onRemove?: (id: string) => void }) {
  if (model.history.length === 0 && model.totalSessions === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 p-10">
        <p className="text-xs font-medium text-muted-foreground">Progress</p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight">No rehearsals to track yet</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Finish a rehearsal and your growth will start building here.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
        <p className="text-xs font-medium text-muted-foreground">Progress</p>
        <h1 className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight">{model.totalSessions} sessions in</h1>
        {model.nextFocus ? <p className="mt-3 text-sm text-muted-foreground">Next focus: <span className="text-foreground">{model.nextFocus}</span></p> : null}
      </section>

      {model.series.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
          <h2 className="text-lg font-semibold text-foreground">Growth</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {model.series.map((s) => <DimensionSparkline key={s.dimension} dimension={s.dimension} points={s.points} delta={s.delta} />)}
          </div>
        </section>
      ) : null}

      {model.recurringWeaknesses.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
          <h2 className="text-lg font-semibold text-foreground">Recurring weaknesses</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {model.recurringWeaknesses.map((w) => (
              <li key={w.label} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 hover:bg-surface">
                <span className="text-sm text-foreground">{w.label}</span>
                <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">seen {w.count}x</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
        <h2 className="text-lg font-semibold text-foreground">Session history</h2>
        <ol className="mt-4 flex flex-col divide-y divide-border">
          {model.history.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-4 px-1 py-3">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{h.title}</span>
                <span className="text-xs text-muted-foreground">{h.date}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Link href={h.href} className="text-sm font-medium text-primary underline-offset-4 hover:underline">Open report</Link>
                {onRemove && <RemoveSessionButton title={h.title} onConfirm={() => onRemove(h.id)} />}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
