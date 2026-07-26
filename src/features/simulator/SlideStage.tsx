'use client';

import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SlideStage({ slide, position, total, onPrev, onNext }: {
  slide: { index: number; text: string; imageUrl: string };
  position: number; total: number; onPrev: () => void; onNext: () => void;
}) {
  return (
    <section aria-label="Active presentation slide" className="flex min-w-0 flex-col gap-3">
      <div className="relative rounded-xl border border-border bg-card p-2">
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted/30">
          <AuthenticatedSlideImage source={slide.imageUrl} alt={`Slide ${position + 1}: ${slide.text}`} className="h-full w-full object-contain" />
          <span className="absolute right-3 top-3 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] backdrop-blur">
            {String(position + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate px-1 text-sm text-muted-foreground">{slide.text}</p>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label="Previous slide" onClick={onPrev} disabled={position === 0} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>Prev</button>
          <button type="button" aria-label="Next slide" onClick={onNext} disabled={position >= total - 1} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>Next</button>
        </div>
      </div>
    </section>
  );
}
