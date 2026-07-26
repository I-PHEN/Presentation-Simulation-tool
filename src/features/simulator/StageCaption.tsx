'use client';

import { cn } from '@/lib/utils';

/** Subtitle bar over the bottom of the stage. `text` is the progressively
 * revealed prefix; `fullText` is announced once to assistive tech so screen
 * readers hear the line instead of every partial word. */
export function StageCaption({ text, fullText, speaker, speaking }: {
  text: string | null; fullText: string | null; speaker: string | null; speaking: boolean;
}) {
  return (
    <div aria-label="Panel caption" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-3 pb-3 sm:px-6 sm:pb-5">
      <span aria-live="polite" className="sr-only">{fullText ?? ''}</span>
      {text && (
        <div className="w-full max-w-3xl rounded-lg border border-border bg-popover/95 px-4 py-3 backdrop-blur-sm sm:px-5">
          {speaker && (
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide">
              <span aria-hidden="true" className={cn('size-1.5 rounded-full', speaking ? 'bg-primary' : 'bg-muted-foreground/50')} />
              <span className={cn(speaking ? 'text-primary' : 'text-muted-foreground')}>{speaker}</span>
            </p>
          )}
          <p aria-hidden="true" className="text-pretty text-base leading-7 sm:text-lg sm:leading-8">
            {text}
            {speaking && text !== fullText && (
              <span aria-hidden="true" className="ml-1 inline-block h-[0.9em] w-[2px] translate-y-[1px] bg-primary/80" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}
