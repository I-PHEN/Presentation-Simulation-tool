'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { formatTimestamp } from '@/features/defense/coaching-timeline';
import { nextTarget, paceState } from './session-timer';
import { cn } from '@/lib/utils';

const PACE_CLASS = {
  none: 'text-muted-foreground',
  ok: 'text-muted-foreground',
  close: 'text-warning',
  over: 'text-destructive',
} as const;

/**
 * The running clock, ticking on its own interval so the once-a-second update
 * never re-renders the room or the stage. Click to cycle a target and rehearse
 * against a limit; the target is in-room only and is not persisted.
 */
export function SessionTimer({ startedAtMs, targetMs, onCycleTarget }: {
  startedAtMs: number;
  targetMs: number | null;
  onCycleTarget: (next: number | null) => void;
}) {
  const [elapsedMs, setElapsedMs] = useState(() => Math.max(0, Date.now() - startedAtMs));

  useEffect(() => {
    const tick = () => setElapsedMs(Math.max(0, Date.now() - startedAtMs));
    tick();
    const handle = setInterval(tick, 1000);
    return () => clearInterval(handle);
  }, [startedAtMs]);

  const state = paceState(elapsedMs, targetMs);
  const label = targetMs === null
    ? `Elapsed ${formatTimestamp(elapsedMs)}. Set a time target.`
    : `Elapsed ${formatTimestamp(elapsedMs)} of ${formatTimestamp(targetMs)} target. Change target.`;

  return (
    <button
      type="button"
      onClick={() => onCycleTarget(nextTarget(targetMs))}
      aria-label={label}
      title={label}
      data-pace={state}
      className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 font-mono text-xs transition-colors hover:bg-accent', PACE_CLASS[state])}
    >
      <Timer className="size-3.5" aria-hidden="true" />
      <span>{formatTimestamp(elapsedMs)}</span>
      {targetMs !== null && <span className="opacity-70">/ {formatTimestamp(targetMs)}</span>}
    </button>
  );
}
