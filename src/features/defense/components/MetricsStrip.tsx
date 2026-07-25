import type { CoachingMetrics } from '@/features/defense/types';

function Metric({ label, value, atMs, onSeek }: { label: string; value: string; atMs?: number; onSeek: (ms: number) => void }) {
  const body = (
    <span className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-lg text-foreground">{value}</span>
    </span>
  );
  if (typeof atMs === 'number') {
    return <button type="button" onClick={() => onSeek(atMs)} className="rounded-lg border border-border bg-surface px-4 py-3 text-left shadow-e1 transition-shadow hover:shadow-e2">{body}</button>;
  }
  return <div className="rounded-lg border border-border bg-surface px-4 py-3 shadow-e1">{body}</div>;
}

export function MetricsStrip({ metrics, onSeek }: { metrics: CoachingMetrics; onSeek: (ms: number) => void }) {
  const longest = [...metrics.slideTimes].sort((a, b) => b.ms - a.ms)[0];
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">How you delivered</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Pace (wpm)" value={metrics.paceWpm === null ? '--' : String(metrics.paceWpm)} onSeek={onSeek} />
        <Metric label="Fillers / min" value={metrics.fillerPerMin === null ? '--' : metrics.fillerPerMin.toFixed(1)} onSeek={onSeek} />
        {/* Slide-derived signals are meaningless without slides - omit them for topic sessions. */}
        {!metrics.deckless && <Metric label="Slides read near-verbatim" value={String(metrics.verbatimSlides)} onSeek={onSeek} />}
        <Metric label="Questions handled" value={`${metrics.questionsHandled.handled} of ${metrics.questionsHandled.total}`} onSeek={onSeek} />
        {!metrics.deckless && longest ? <Metric label={`Longest on slide ${longest.slideIndex}`} value={`${Math.round(longest.ms / 1000)}s`} atMs={longest.atMs} onSeek={onSeek} /> : null}
      </div>
    </section>
  );
}
