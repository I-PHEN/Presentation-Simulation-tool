import Link from 'next/link';
import type { DeckContext, SlideContext } from '@/features/defense/types';
import type { TodayModel } from '@/features/defense/studio-session-model';
import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  upload: 'Setup needed',
  analyzed: 'Ready to rehearse',
  practicing: 'In progress',
  completed: 'Reviewed',
};

const STATUS_DOT: Record<string, string> = {
  upload: 'bg-warning',
  analyzed: 'bg-primary',
  practicing: 'bg-primary',
  completed: 'bg-success',
};

/**
 * Prefers the slide the data-backed cue points at (the examiner's highest-leverage
 * slide) so the preview and the cue always agree; falls back to the deck's first
 * slide when there is no cue or the referenced slide is missing.
 */
function selectPreviewSlide(deck: DeckContext, cue?: string): SlideContext | undefined {
  const cueIndex = cue ? Number(cue.replace(/\D+/g, '')) : undefined;
  const cued = cueIndex ? deck.slides.find((slide) => slide.index === cueIndex) : undefined;
  return cued ?? deck.slides[0];
}

function slideCountLabel(count: number): string {
  return `${count} slide${count === 1 ? '' : 's'}`;
}

/**
 * The Today workspace: a single contiguous surface built from real session data.
 * There is exactly one saturated (cobalt) control on the page - the primary action -
 * everything else reads as structure, not decoration.
 */
export function StudioDesk({ model }: { model: TodayModel }) {
  const { active, recent } = model;
  const previewSlide = active ? selectPreviewSlide(active.deck, active.cue) : undefined;
  // Only ever show this pane when there is real, API-backed content to put in
  // it (a coach note or a finished report) - never a filler sentence.
  const hasSupportPanel = Boolean(active?.coachNote || active?.reportHref);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-6 shadow-e1" aria-labelledby="next-rehearsal-heading">
        <p className="text-xs font-medium text-muted-foreground">Your next rehearsal</p>
        <h1 id="next-rehearsal-heading" className="mt-3 font-display text-3xl sm:text-4xl font-medium tracking-tight">
          {active?.title ?? 'Build your first defense programme'}
        </h1>
        {active && (
          <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className={cn('size-1.5 rounded-full', STATUS_DOT[active.status] ?? 'bg-primary')} aria-hidden="true" />
            {STATUS_LABELS[active.status] ?? active.status}
          </span>
        )}
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {active
            ? 'Step back into your rehearsal and close the gap the examiner flagged.'
            : 'Set up your next rehearsal — bring a deck or speak to a topic — then face real examiner pressure.'}
        </p>
        <Link href={model.primaryAction.href} className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-fit')}>
          {model.primaryAction.label}
        </Link>
      </section>

      {active?.deck && (
        <section
          className={cn('grid gap-6', hasSupportPanel && 'md:grid-cols-[2fr_1fr]')}
          aria-labelledby="deck-heading"
        >
          <div className="rounded-xl border border-border bg-card p-6 shadow-e1">
            <p id="deck-heading" className="text-xs font-medium text-muted-foreground">
              Deck in play
            </p>
            {previewSlide && (
              <div className="relative mt-4 rounded-xl border border-border bg-card p-2 shadow-e2 before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary before:to-transparent after:absolute after:inset-0 after:-z-10 after:rounded-xl after:bg-primary/10 after:blur-2xl">
                <div className="aspect-video overflow-hidden rounded-lg bg-muted/30">
                  <AuthenticatedSlideImage
                    source={previewSlide.imageUrl}
                    alt={`Slide ${previewSlide.index}: ${previewSlide.text}`}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="absolute right-3 top-3 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] backdrop-blur">
                  {previewSlide.index}/{active.deck.slides.length}
                </span>
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              {active.deck.sourceName} · {slideCountLabel(active.deck.slides.length)}
            </p>
            {active.cue && <p className="mt-1 text-sm font-medium text-accent-foreground">{active.cue}</p>}
          </div>
          {hasSupportPanel && (
            <div className="flex flex-col gap-6">
              {active.coachNote && (
                <section className="rounded-xl border border-border bg-card p-6 shadow-e1" aria-labelledby="coach-note-heading">
                  <p id="coach-note-heading" className="text-xs font-medium text-muted-foreground">
                    Coach note
                  </p>
                  <p className="mt-4 text-sm leading-6">{active.coachNote}</p>
                </section>
              )}
              {active.reportHref && (
                <Link
                  href={active.reportHref}
                  className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'w-fit')}
                >
                  Open latest review
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {recent.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-3 shadow-e1" aria-labelledby="recent-sessions-heading">
          <p id="recent-sessions-heading" className="px-3 pt-2 text-xs font-medium text-muted-foreground">
            Recent sessions
          </p>
          <ul className="mt-1 divide-y divide-border">
            {recent.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-surface">
                <div>
                  <p className="text-sm font-medium">{row.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{STATUS_LABELS[row.status] ?? row.status}</p>
                </div>
                <Link href={row.action.href} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0')}>
                  {row.action.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
