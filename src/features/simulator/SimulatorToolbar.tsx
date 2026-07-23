'use client';

import { Mic, MicOff, Users, Captions, PhoneOff } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SimulatorToolbar({ recording, micActive, onToggleMic, onToggleParticipants, onToggleTranscript, onEnd, endDisabled }: {
  recording?: boolean; micActive: boolean; onToggleMic: () => void; onToggleParticipants: () => void; onToggleTranscript: () => void; onEnd: () => void; endDisabled?: boolean;
}) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-popover/90 px-3 py-2 shadow-e3 backdrop-blur-xl">
      {recording && (
        <span aria-label="Recording in progress" className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
          <span className="size-2 rounded-full bg-destructive" aria-hidden="true" /> Rec
        </span>
      )}
      <button type="button" aria-label={micActive ? 'Mute microphone' : 'Turn on microphone'} onClick={onToggleMic}
        className={cn(buttonVariants({ variant: micActive ? 'default' : 'secondary', size: 'icon' }), 'rounded-full')}>
        {micActive ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}
      </button>
      <button type="button" aria-label="Show participants" onClick={onToggleParticipants} className={cn(buttonVariants({ variant: 'secondary', size: 'icon' }), 'rounded-full')}>
        <Users className="size-4" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Show transcript" onClick={onToggleTranscript} className={cn(buttonVariants({ variant: 'secondary', size: 'icon' }), 'rounded-full')}>
        <Captions className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onEnd} disabled={endDisabled} className={cn(buttonVariants({ variant: 'destructive', size: 'sm' }), 'rounded-full')}>
        <PhoneOff className="size-4" aria-hidden="true" /> End rehearsal
      </button>
    </div>
  );
}
