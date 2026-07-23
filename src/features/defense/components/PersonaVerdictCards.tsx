import { formatTimestamp } from '@/features/defense/coaching-timeline';
import type { PersonaVerdict } from '@/features/defense/types';

export function PersonaVerdictCards({ verdicts, onSeek }: { verdicts: PersonaVerdict[]; onSeek: (ms: number) => void }) {
  if (verdicts.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">What the panel pressed on</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {verdicts.map((verdict) => (
          <article key={verdict.personaId} className="rounded-lg border border-border bg-surface/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">{verdict.personaTitle}</h3>
            {verdict.verdictLine ? <p className="mt-1 text-sm text-muted-foreground">{verdict.verdictLine}</p> : null}
            <ul className="mt-3 flex flex-col gap-2">
              {verdict.challenges.map((challenge, index) => (
                <li key={`${challenge.atMs}-${index}`}>
                  <button type="button" onClick={() => onSeek(challenge.atMs)} className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface">
                    <span className="mt-0.5 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{formatTimestamp(challenge.atMs)}</span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm text-foreground">{challenge.text}</span>
                      <span className="text-xs text-muted-foreground">Slide {challenge.slideIndex} - {challenge.responded ? 'you responded' : 'no response captured'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
