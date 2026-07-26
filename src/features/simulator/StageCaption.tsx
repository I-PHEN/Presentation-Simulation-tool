'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * The band under the slide. It carries the panel's streaming caption while
 * someone is speaking and the slide's own text line the rest of the time, so it
 * is never an empty reserved strip and never covers the slide.
 *
 * `text` is the progressively revealed prefix; `fullText` is announced once to
 * assistive tech so screen readers hear whole lines, not every partial word.
 */
export function StageCaption({ text, fullText, speaker, speaking, idleText }: {
  text: string | null;
  fullText: string | null;
  speaker: string | null;
  speaking: boolean;
  /** Shown when the panel has not spoken yet: the slide text, or a topic hint. */
  idleText?: string;
}) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  // A long caption outgrows two lines mid-reveal; follow the newest words
  // rather than clipping the tail (same approach as the transcript list).
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [text]);

  const showCaption = Boolean(text);
  return (
    <div aria-label="Panel caption" className="flex h-16 shrink-0 items-center gap-3 rounded-lg border border-border bg-card px-3 sm:px-4">
      <span aria-live="polite" className="sr-only">{fullText ?? ''}</span>
      {showCaption && speaker && (
        <span className="flex shrink-0 items-center gap-2 self-start pt-0.5 text-[11px] font-medium uppercase tracking-wide">
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', speaking ? 'bg-primary' : 'bg-muted-foreground/50')} />
          <span className={cn(speaking ? 'text-primary' : 'text-muted-foreground')}>{speaker}</span>
        </span>
      )}
      <p
        ref={bodyRef}
        aria-hidden="true"
        className={cn(
          'max-h-12 min-w-0 flex-1 overflow-hidden text-pretty leading-6',
          showCaption ? 'text-[15px] text-foreground' : 'text-sm text-muted-foreground',
        )}
      >
        {showCaption ? text : idleText}
        {showCaption && speaking && text !== fullText && (
          <span aria-hidden="true" className="ml-1 inline-block h-[0.9em] w-[2px] translate-y-[1px] bg-primary/80" />
        )}
      </p>
    </div>
  );
}
