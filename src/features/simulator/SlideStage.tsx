'use client';

import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';

/**
 * The slide, as large as the remaining height allows. The frame takes the
 * image's own aspect ratio (`h-full w-fit`) rather than spanning the column, so
 * a 16:9 deck stops leaving dead gutters either side and a 4:3 deck is not
 * double-letterboxed. Navigation lives in the toolbar and the caption in the
 * band below, so nothing covers the slide.
 */
export function SlideStage({ slide, position, total }: {
  slide: { index: number; text: string; imageUrl: string };
  position: number; total: number;
}) {
  return (
    <section aria-label="Active presentation slide" className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
      {/* flex centring keeps the pre-load status text in the middle of the frame */}
      <div className="relative flex h-full w-fit min-w-0 max-w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card">
        <AuthenticatedSlideImage source={slide.imageUrl} alt={`Slide ${position + 1}: ${slide.text}`} className="h-full w-auto max-w-full object-contain" />
        <span className="absolute right-3 top-3 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] backdrop-blur">
          {String(position + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
    </section>
  );
}
