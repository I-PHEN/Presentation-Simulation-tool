import { formatTimestamp, isSessionRelativeMs } from '@/features/defense/coaching-timeline';
import type { PersonaVerdict } from '@/features/defense/types';

export function PersonaVerdictCards({ verdicts, onSeek }: { verdicts: PersonaVerdict[]; onSeek: (ms: number) => void }) {
  if (verdicts.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">What the panel pressed on</h2>
      {/* auto-fit, so a lone verdict fills the row instead of being squeezed into a third of it */}
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] gap-4">
        {verdicts.map((verdict) => (
          <article key={verdict.personaId} className="min-w-0 rounded-lg border border-border bg-surface/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">{verdict.personaTitle}</h3>
            {verdict.verdictLine ? <p className="mt-1 text-sm text-muted-foreground">{verdict.verdictLine}</p> : null}
            <ul className="mt-3 flex flex-col gap-2">
              {verdict.challenges.map((challenge, index) => {
                const seekable = isSessionRelativeMs(challenge.atMs);
                return (
                  <li key={`${challenge.atMs}-${index}`}>
                    <button
                      type="button"
                      onClick={() => { if (seekable) onSeek(challenge.atMs); }}
                      disabled={!seekable}
                      className="flex w-full min-w-0 flex-col gap-1 rounded-md px-2 py-1.5 text-left enabled:hover:bg-surface"
                    >
                      {/* Meta on its own line: the question then gets the full card width. */}
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {seekable && (
                          <span className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[11px]">{formatTimestamp(challenge.atMs)}</span>
                        )}
                        Slide {challenge.slideIndex} - {challenge.responded ? 'you responded' : 'no response captured'}
                      </span>
                      <span className="text-sm text-foreground">{challenge.text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
