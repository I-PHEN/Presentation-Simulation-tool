import { formatTimestamp } from '@/features/defense/coaching-timeline';
import type { TimelineMoment } from '@/features/defense/types';

const KIND_LABEL: Record<TimelineMoment['kind'], string> = { presenter: 'You', question: 'Question', interrupt: 'Interruption', follow_up: 'Follow-up' };

export function EvidenceTimeline({ timeline, onSeek }: { timeline: TimelineMoment[]; onSeek: (ms: number) => void }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">Timeline of moments</h2>
      <ol className="mt-4 flex flex-col gap-2">
        {timeline.map((moment, index) => (
          <li key={`${moment.atMs}-${index}`}>
            <button type="button" onClick={() => onSeek(moment.atMs)} className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface">
              <span className="mt-0.5 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{formatTimestamp(moment.atMs)}</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">{KIND_LABEL[moment.kind]}{moment.personaTitle ? ` - ${moment.personaTitle}` : ''} - Slide {moment.slideIndex}</span>
                <span className="text-sm text-foreground">{moment.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
