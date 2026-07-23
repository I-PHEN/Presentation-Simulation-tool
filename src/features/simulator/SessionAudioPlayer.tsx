'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';

export interface SessionAudioPlayerHandle {
  seekTo(seconds: number): void;
}

export const SessionAudioPlayer = forwardRef<SessionAudioPlayerHandle, { audioPath?: string | null }>(function SessionAudioPlayer({ audioPath }, ref) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = Math.max(0, seconds);
      void el.play?.();
    },
  }), []);

  if (!audioPath) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-sm text-muted-foreground">
        No recording was captured for this session.
      </div>
    );
  }
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-sm font-medium text-foreground">Session recording</h2>
      <p className="mt-1 text-xs text-muted-foreground">Replay exactly what you said, start to finish.</p>
      <audio ref={audioRef} className="mt-4 w-full" controls preload="metadata">
        <source src={audioPath} type="audio/webm" />
      </audio>
    </section>
  );
});
