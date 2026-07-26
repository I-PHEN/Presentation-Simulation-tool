'use client';

import { ChevronLeft, ChevronRight, Mic, MicOff, Users, Captions, PhoneOff } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SimulatorToolbar({ recording, micActive, onToggleMic, onToggleParticipants, onToggleTranscript, onEnd, endDisabled, slideNav }: {
  recording?: boolean; micActive: boolean; onToggleMic: () => void; onToggleParticipants: () => void; onToggleTranscript: () => void; onEnd: () => void; endDisabled?: boolean;
  /** Omitted in topic mode, which has a single card and nothing to page through. */
  slideNav?: { onPrev: () => void; onNext: () => void; prevDisabled: boolean; nextDisabled: boolean };
}) {
  const round = (variant: 'default' | 'secondary' | 'destructive') =>
    cn(buttonVariants({ variant, size: 'icon' }), 'size-8 rounded-full');

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-popover px-3 py-1.5 shadow-e3">
      {slideNav && (
        <>
          <span aria-hidden="true" className="hidden font-mono text-[11px] text-muted-foreground sm:inline">&#8592; &#8594;</span>
          <button type="button" aria-label="Previous slide" onClick={slideNav.onPrev} disabled={slideNav.prevDisabled} className={round('secondary')}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next slide" onClick={slideNav.onNext} disabled={slideNav.nextDisabled} className={round('secondary')}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        </>
      )}
      {recording && (
        <span aria-label="Recording in progress" className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
          <span className="size-2 rounded-full bg-destructive" aria-hidden="true" /> Rec
        </span>
      )}
      <button type="button" aria-label={micActive ? 'Mute microphone' : 'Turn on microphone'} onClick={onToggleMic} className={round(micActive ? 'default' : 'secondary')}>
        {micActive ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}
      </button>
      <button type="button" aria-label="Show participants" onClick={onToggleParticipants} className={round('secondary')}>
        <Users className="size-4" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Show transcript" onClick={onToggleTranscript} className={round('secondary')}>
        <Captions className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onEnd} disabled={endDisabled} className={cn(buttonVariants({ variant: 'destructive', size: 'sm' }), 'h-8 rounded-full')}>
        <PhoneOff className="size-4" aria-hidden="true" /> End rehearsal
      </button>
    </div>
  );
}
