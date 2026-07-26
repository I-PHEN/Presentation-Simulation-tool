'use client';

import type { ReactNode } from 'react';
import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SlideStage({ slide, position, total, onPrev, onNext, caption }: {
  slide: { index: number; text: string; imageUrl: string };
  position: number; total: number; onPrev: () => void; onNext: () => void;
  /** Overlaid on the slide itself, like burned-in subtitles. */
  caption?: ReactNode;
}) {
  return (
    <section aria-label="Active presentation slide" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="relative min-h-0 flex-1 rounded-xl border border-border bg-card p-2">
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-muted/30">
          <AuthenticatedSlideImage source={slide.imageUrl} alt={`Slide ${position + 1}: ${slide.text}`} className="h-full w-full object-contain" />
          <span className="absolute right-3 top-3 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] backdrop-blur">
            {String(position + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          {caption}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate px-1 text-sm text-muted-foreground">{slide.text}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className="hidden font-mono text-[11px] text-muted-foreground sm:inline">&#8592; &#8594;</span>
          <button type="button" aria-label="Previous slide" onClick={onPrev} disabled={position === 0} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>Prev</button>
          <button type="button" aria-label="Next slide" onClick={onNext} disabled={position >= total - 1} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>Next</button>
        </div>
      </div>
    </section>
  );
}
