/** Targets a speaker can rehearse against, in minutes. `null` is no target. */
export const TARGET_MINUTES: readonly (number | null)[] = [null, 5, 10, 15, 20, 30];

export type PaceState = 'none' | 'ok' | 'close' | 'over';

/** Where the elapsed time sits against the target: `close` from 85% of it. */
export function paceState(elapsedMs: number, targetMs: number | null): PaceState {
  if (targetMs === null || targetMs <= 0) return 'none';
  if (elapsedMs > targetMs) return 'over';
  return elapsedMs >= targetMs * 0.85 ? 'close' : 'ok';
}

/** Cycles off -> 5 -> 10 -> 15 -> 20 -> 30 -> off, in milliseconds. */
export function nextTarget(currentMs: number | null): number | null {
  const currentMinutes = currentMs === null ? null : Math.round(currentMs / 60_000);
  const index = TARGET_MINUTES.indexOf(currentMinutes);
  // An unrecognised target restarts at the first real preset, not at `null`
  // (index 0) - cycling from an odd value should offer a target, not clear it.
  const next = TARGET_MINUTES[index === -1 ? 1 : (index + 1) % TARGET_MINUTES.length];
  return next === null ? null : next * 60_000;
}
