'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * The band under the slide carrying the panel's streaming caption.
 * Fades out automatically 3 seconds after the panel finishes speaking,
 * keeping the presentation stage clean and distraction-free.
 */
export function StageCaption({ text, fullText, speaker, speaking, idleText, overlay = false }: {
  text: string | null;
  fullText: string | null;
  speaker: string | null;
  speaking: boolean;
  /** Shown when the panel has not spoken yet: the slide text, or a topic hint. */
  idleText?: string;
  /** Maximized mode has no room below the slide, so the caption floats over its
   * bottom edge like video subtitles. */
  overlay?: boolean;
}) {
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const [visible, setVisible] = useState(() => Boolean(text));

  // Auto-disappear timer: show immediately while speaking, hide 3s after speaking ends
  useEffect(() => {
    if (speaking && text) {
      setVisible(true);
      return;
    }

    if (!speaking && text && visible) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (!text) {
      setVisible(false);
    }
  }, [speaking, text, visible]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [text]);

  const showCaption = Boolean(text) && visible;

  if (overlay && !showCaption) {
    return <span aria-live="polite" className="sr-only">{fullText ?? ''}</span>;
  }

  return (
    <div
      aria-label="Panel caption"
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border px-4 transition-all duration-500 ease-out',
        overlay
          ? 'pointer-events-none absolute inset-x-4 bottom-16 z-10 mx-auto max-w-xl glass-card py-3 shadow-xl'
          : 'h-16 shrink-0 mx-auto w-full max-w-2xl glass-panel shadow-sm',
        showCaption
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-2 scale-98 pointer-events-none h-0 py-0 border-transparent overflow-hidden my-0',
      )}
    >
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

