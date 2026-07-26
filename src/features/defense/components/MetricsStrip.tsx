import { formatTimestamp } from '@/features/defense/coaching-timeline';
import type { CoachingMetrics } from '@/features/defense/types';

const LOW_MOMENT_LABEL = { eyeContact: 'Looked away from camera', posture: 'Posture dropped' } as const;

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
        {/* Camera signals exist only when the camera was on long enough to be evidence. */}
        {metrics.delivery && <Metric label="Eye contact" value={String(metrics.delivery.eyeContact)} onSeek={onSeek} />}
        {metrics.delivery && <Metric label="Posture" value={String(metrics.delivery.posture)} onSeek={onSeek} />}
      </div>
      {metrics.delivery && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Camera scores are from {metrics.delivery.samples} frames over {formatTimestamp(metrics.delivery.coverageMs)} of this session.
          </p>
          {metrics.delivery.lowMoments.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {metrics.delivery.lowMoments.map((moment) => (
                <li key={`${moment.kind}-${moment.atMs}`}>
                  <button type="button" onClick={() => onSeek(moment.atMs)} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground hover:bg-popover">
                    <span className="font-mono text-foreground">{formatTimestamp(moment.atMs)}</span> {LOW_MOMENT_LABEL[moment.kind]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
