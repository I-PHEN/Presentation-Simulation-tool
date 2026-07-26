import Link from 'next/link';
import type { DeckContext, SlideContext } from '@/features/defense/types';
import type { TodayModel } from '@/features/defense/studio-session-model';
import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RemoveSessionButton } from './remove-session-button';

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

function selectPreviewSlide(deck: DeckContext, cue?: string): SlideContext | undefined {
  const cueIndex = cue ? Number(cue.replace(/\D+/g, '')) : undefined;
  const cued = cueIndex ? deck.slides.find((slide) => slide.index === cueIndex) : undefined;
  return cued ?? deck.slides[0];
}

/** A deck source name is usually a raw filename; make it presentable for a heading. */
function displayTitle(title: string): string {
  return title.replace(/\.(pptx|ppt|pdf)$/i, '').replace(/[_-]+/g, ' ').trim() || title;
}

/**
 * The Continue hero: the one decisive thing to do on Home. It merges the deck/topic
 * preview, the active session, its status, the coaching focus, and the primary action
 * into a single focused card - never a stack of empty boxes, never fabricated content.
 */
export function StudioDesk({ model, focus, onRemove }: { model: TodayModel; focus?: string; onRemove?: (id: string) => void }) {
  const { active } = model;

  if (!active) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 sm:p-8" aria-labelledby="continue-heading">
        <p id="continue-heading" className="text-xs font-medium text-muted-foreground">Get started</p>
        <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">Start your first rehearsal</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Bring a deck or speak to a topic, then face real examiner pressure.
        </p>
        <Link href={model.primaryAction.href} className={cn(buttonVariants({ size: 'lg' }), 'mt-5 w-fit')}>
          {model.primaryAction.label}
        </Link>
      </section>
    );
  }

  const isTopic = active.source === 'topic';
  const previewSlide = !isTopic ? selectPreviewSlide(active.deck, active.cue) : undefined;
  // Only ever a real, API-backed line: the longitudinal focus, else this session's drill.
  const focusLine = (focus && focus.trim()) || active.coachNote;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6" aria-labelledby="continue-heading">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="shrink-0 sm:w-64">
          {isTopic ? (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-surface">
              <span className="text-xs font-medium text-muted-foreground">Topic session</span>
            </div>
          ) : previewSlide ? (
            <div className="relative overflow-hidden rounded-lg border border-border bg-surface">
              <div className="aspect-video">
                <AuthenticatedSlideImage
                  source={previewSlide.imageUrl}
                  alt={`Slide ${previewSlide.index}`}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="absolute right-2 top-2 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px]">
                {previewSlide.index}/{active.deck.slides.length}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p id="continue-heading" className="text-xs font-medium text-muted-foreground">Continue</p>
          <h2 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">{displayTitle(active.title)}</h2>
          <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className={cn('size-1.5 rounded-full', STATUS_DOT[active.status] ?? 'bg-primary')} aria-hidden="true" />
            {STATUS_LABELS[active.status] ?? active.status}
          </span>
          {focusLine && (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">Focus:</span> {focusLine}
            </p>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            <Link href={model.primaryAction.href} className={cn(buttonVariants({ size: 'lg' }))}>
              {model.primaryAction.label}
            </Link>
            {/* The way out when this session keeps holding the top of Home. */}
            {onRemove && <RemoveSessionButton title={displayTitle(active.title)} onConfirm={() => onRemove(active.id)} showLabel />}
          </div>
        </div>
      </div>
    </section>
  );
}
