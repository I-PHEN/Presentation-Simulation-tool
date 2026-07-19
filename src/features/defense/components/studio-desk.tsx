import Link from 'next/link';
import type { DeckContext, SlideContext } from '@/features/defense/types';
import type { TodayModel } from '@/features/defense/studio-session-model';
import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';

const STATUS_LABELS: Record<string, string> = {
  upload: 'Setup needed',
  analyzed: 'Ready to rehearse',
  practicing: 'In progress',
  completed: 'Reviewed',
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
  const { active } = model;
  const previewSlide = active ? selectPreviewSlide(active.deck, active.cue) : undefined;

  return (
    <div className="border-y border-border">
      <section className="py-10 sm:py-14" aria-labelledby="next-rehearsal-heading">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Your next rehearsal
        </p>
        <h1 id="next-rehearsal-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {active?.title ?? 'Build your first defense programme'}
        </h1>
        {active && (
          <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {STATUS_LABELS[active.status] ?? active.status}
          </span>
        )}
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {active
            ? 'Step back into your rehearsal and close the gap the examiner flagged.'
            : 'Import the deck you will defend, then rehearse against real examiner pressure.'}
        </p>
        <Link
          href={model.primaryAction.href}
          className="mt-6 inline-flex w-fit items-center justify-center bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {model.primaryAction.label}
        </Link>
      </section>

      {active?.deck && (
        <section
          className="grid border-t border-border md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
          aria-labelledby="deck-heading"
        >
          <div className="py-7 md:border-r md:border-border md:pr-8">
            <p id="deck-heading" className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Deck in play
            </p>
            {previewSlide && (
              <div className="mt-4 aspect-video max-w-sm overflow-hidden border border-border bg-muted/20">
                <AuthenticatedSlideImage
                  source={previewSlide.imageUrl}
                  alt={`Slide ${previewSlide.index}: ${previewSlide.text}`}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              {active.deck.sourceName} · {slideCountLabel(active.deck.slides.length)}
            </p>
            {active.cue && <p className="mt-1 text-sm font-medium text-accent-foreground">{active.cue}</p>}
          </div>
          <div className="border-t border-border py-7 md:border-t-0 md:pl-8">
            {active.coachNote ? (
              <>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Coach note
                </p>
                <p className="mt-4 max-w-sm text-sm leading-6">{active.coachNote}</p>
              </>
            ) : (
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Your coach will leave a note here once this rehearsal has evidence to review.
              </p>
            )}
            {active.reportHref && (
              <Link
                href={active.reportHref}
                className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
              >
                Open latest review
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
