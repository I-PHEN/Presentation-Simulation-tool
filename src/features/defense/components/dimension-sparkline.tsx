const DELTA_LABEL: Record<'up' | 'down' | 'steady', string> = { up: 'improving', down: 'slipping', steady: 'steady' };

export function DimensionSparkline({ dimension, points, delta }: { dimension: string; points: { label: string; value: number }[]; delta: 'up' | 'down' | 'steady' }) {
  const current = points.length ? points[points.length - 1].value : 0;
  const single = points.length < 2;
  const W = 120, H = 36;
  const coords = points.map((p, i) => {
    const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * W;
    const y = H - (Math.max(0, Math.min(100, p.value)) / 100) * H;
    return { x, y };
  });
  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const label = single
    ? `${dimension}: ${current} out of 100, new`
    : `${dimension}: ${points[0].value} to ${current} over ${points.length} sessions, ${DELTA_LABEL[delta]}`;
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 shadow-e1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium capitalize text-muted-foreground">{dimension}</span>
        <span className="font-mono text-sm text-foreground">{current}</span>
      </div>
      <svg role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} className="mt-2 h-9 w-full overflow-visible">
        {single ? (
          <circle cx={W / 2} cy={H - (current / 100) * H} r={3} className="fill-primary" />
        ) : (
          <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <span className="text-xs text-muted-foreground">{single ? 'New' : DELTA_LABEL[delta]}</span>
    </div>
  );
}
