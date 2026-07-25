import { cn } from '@/lib/utils';

export type RehearseSource = 'deck' | 'topic';

const SOURCES: ReadonlyArray<readonly [RehearseSource, string, string]> = [
  ['deck', 'Deck', 'Present the slides you will defend.'],
  ['topic', 'Topic', 'Speak to a topic — no slides needed.'],
];

/**
 * Step 0 of Rehearse: what are you rehearsing against? A presentational
 * segmented control; the page owns which source is active and swaps the body.
 */
export function RehearseSourcePicker({
  source,
  onSelect,
}: {
  source: RehearseSource;
  onSelect: (source: RehearseSource) => void;
}): React.ReactElement {
  return (
    <section aria-labelledby="rehearse-step-mode" className="rounded-xl border border-border bg-card p-6 shadow-e1 sm:p-8">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-xs text-muted-foreground">00</span>
        <h2 id="rehearse-step-mode" className="text-base font-medium">What are you rehearsing against?</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {SOURCES.map(([value, label, help]) => (
          <button
            key={value}
            type="button"
            aria-pressed={source === value}
            onClick={() => onSelect(value)}
            className={cn(
              'cursor-pointer rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-popover focus-visible:outline-none focus-visible:shadow-focus',
              source === value && 'border-primary bg-accent shadow-e1',
            )}
          >
            <span className="block text-sm font-medium">{label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{help}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * Honest placeholder for the Topic source until Part C ships the real
 * deckless setup. Rendered by the page, never inside RehearseSetup (which
 * must stay deck-only per its tests).
 */
export function TopicComingSoon(): React.ReactElement {
  return (
    <section className="rounded-xl border border-dashed border-border bg-surface/40 p-8 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="font-display text-2xl font-medium tracking-tight">Topic mode is coming next</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        Soon you will rehearse a spoken Q&amp;A against the examiner panel without any slides —
        pick a topic tailored to your interests, then defend it out loud. For now, choose{' '}
        <span className="font-medium text-foreground">Deck</span> to rehearse against a presentation.
      </p>
    </section>
  );
}
