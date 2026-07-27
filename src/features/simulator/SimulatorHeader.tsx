'use client';

import { AudioVisualizer } from '@/components/audio-visualizer';
import { cn } from '@/lib/utils';

export interface SimulatorHeaderProps {
  sourceName: string;
  isTopic: boolean;
  position: number;
  total: number;
  micActive: boolean;
  hearing: boolean;
  speakingPersonaId: string | null;
  recording: boolean;
  exitHref?: string;
  className?: string;
}

export function SimulatorHeader({
  sourceName,
  isTopic,
  position,
  total,
  micActive,
  hearing,
  speakingPersonaId,
  recording,
  exitHref = '/dashboard',
  className,
}: SimulatorHeaderProps) {
  return (
    <header
      className={cn(
        'glass-header flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border/40 px-3 sm:px-4 text-foreground backdrop-blur-md',
        className,
      )}
    >
      <a
        href={exitHref}
        className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        Exit rehearsal
      </a>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <p className="min-w-0 truncate text-xs sm:text-sm font-medium">
          {isTopic ? 'Topic rehearsal' : sourceName}
        </p>
        <div
          data-testid="audio-status-pill"
          className="flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-2.5 py-0.5 shrink-0"
        >
          <AudioVisualizer
            type="input"
            isActive={micActive && hearing}
            barCount={4}
            className="h-3.5"
          />
          <AudioVisualizer
            type="output"
            isActive={speakingPersonaId !== null}
            barCount={4}
            className="h-3.5"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {recording && (
          <span
            data-testid="recording-badge"
            className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-500 border border-red-500/20"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            REC
          </span>
        )}
        <span className="shrink-0 text-xs sm:text-sm font-mono text-muted-foreground">
          {isTopic ? 'Speaking to topic' : `Slide ${position + 1} / ${total}`}
        </span>
      </div>
    </header>
  );
}
