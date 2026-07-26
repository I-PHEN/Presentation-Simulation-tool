import { formatTimestamp, isSessionRelativeMs } from '@/features/defense/coaching-timeline';
import type { TimelineMoment } from '@/features/defense/types';

const KIND_LABEL: Record<TimelineMoment['kind'], string> = { presenter: 'You', question: 'Question', interrupt: 'Interruption', follow_up: 'Follow-up' };

export function EvidenceTimeline({ timeline, onSeek, deckless = false }: { timeline: TimelineMoment[]; onSeek: (ms: number) => void; deckless?: boolean }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">Timeline of moments</h2>
      <ol className="mt-4 flex flex-col gap-2">
        {timeline.map((moment, index) => {
          const seekable = isSessionRelativeMs(moment.atMs);
          return (
            <li key={`${moment.atMs}-${index}`}>
              <button type="button" onClick={() => { if (seekable) onSeek(moment.atMs); }} disabled={!seekable} className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left enabled:hover:bg-surface">
                {seekable && <span className="mt-0.5 shrink-0 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{formatTimestamp(moment.atMs)}</span>}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{KIND_LABEL[moment.kind]}{moment.personaTitle ? ` - ${moment.personaTitle}` : ''}{deckless ? '' : ` - Slide ${moment.slideIndex}`}</span>
                  <span className="text-sm text-foreground">{moment.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
