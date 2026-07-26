'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptSegment } from '@/features/defense/types';
import type { SpeechMetrics } from './metrics';
import { cn } from '@/lib/utils';

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <span className="font-mono text-foreground">{value}</span> {label}
    </span>
  );
}

export function TranscriptPanel({ segments, interim, metrics }: {
  segments: TranscriptSegment[]; interim: string; metrics: SpeechMetrics;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  // The page never scrolls, so the transcript has to follow the conversation itself.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [segments.length, interim]);

  return (
    <section aria-label="Live transcript" className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-e1">
      <div className="flex shrink-0 flex-wrap gap-2">
        <Chip label="WPM" value={String(metrics.wpm)} />
        <Chip label="Fillers" value={String(metrics.fillerCount)} />
      </div>
      <ol ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {segments.map((segment, index) => (
          <li key={index} className={cn('rounded-lg px-3 py-2 text-sm leading-6',
            segment.role === 'presenter' ? 'bg-surface' : 'bg-accent/60 text-accent-foreground')}>
            <span className="mr-2 text-[11px] font-medium uppercase text-muted-foreground">{segment.role === 'presenter' ? 'You' : 'Panel'}</span>
            {segment.text}
          </li>
        ))}
        {interim && <li className="rounded-lg px-3 py-2 text-sm italic leading-6 text-muted-foreground">{interim}</li>}
        {segments.length === 0 && !interim && (
          <li className="px-3 py-2 text-sm leading-6 text-muted-foreground">Your words appear here as you speak.</li>
        )}
      </ol>
    </section>
  );
}
