'use client';

import { Mic, MicOff } from 'lucide-react';
import type { Persona } from './personas';
import { ActivityBars } from './ActivityBars';
import { cn } from '@/lib/utils';

const ROW = 'flex items-center gap-3 rounded-xl glass-panel p-3 transition-all duration-200 hover:border-primary/40 shadow-sm';

/** What the microphone is doing right now, from real capture state. */
export type SelfState = { micActive: boolean; hearing: boolean };

export function selfStatus({ micActive, hearing }: SelfState): { label: string; active: boolean } {
  if (!micActive) return { label: 'Mic off', active: false };
  return hearing ? { label: 'Speaking', active: true } : { label: 'Listening for you', active: false };
}

/**
 * Roster only — what the panel is saying lives in the stage caption, so this
 * stays compact enough to share one screen with the transcript. Every row shows
 * whether that voice is active right now, so the turn-taking is visible.
 */
export function AudiencePanel({ panel, speakingPersonaId, self }: {
  panel: Persona[]; speakingPersonaId: string | null; self?: SelfState;
}) {
  const you = self ? selfStatus(self) : null;
  return (
    <section aria-label="Audience panel" className="flex shrink-0 flex-col gap-2">
      {self && you && (
        <div data-state={you.active ? 'speaking' : self.micActive ? 'listening' : 'muted'}
          className={cn(ROW, you.active && 'border-l-2 border-l-primary')}>
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full',
            self.micActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
            {self.micActive ? <Mic className="size-4" aria-hidden="true" /> : <MicOff className="size-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">You</p>
            <p className="truncate text-xs text-muted-foreground">Presenting</p>
          </div>
          <span className={cn('ml-auto flex shrink-0 items-center gap-2 text-[11px] font-medium',
            you.active ? 'text-primary' : 'text-muted-foreground')}>
            <ActivityBars active={you.active} />
            {you.label}
          </span>
        </div>
      )}

      {panel.map((persona) => {
        const speaking = persona.id === speakingPersonaId;
        return (
          <div key={persona.id} data-state={speaking ? 'speaking' : 'listening'}
            className={cn(ROW, speaking && 'border-l-2 border-l-primary')}>
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              speaking ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
              {persona.title.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{persona.title}</p>
              <p className="truncate text-xs text-muted-foreground">{persona.focus}</p>
            </div>
            <span className={cn('ml-auto flex shrink-0 items-center gap-2 text-[11px] font-medium',
              speaking ? 'text-primary' : 'text-muted-foreground')}>
              <ActivityBars active={speaking} />
              {speaking ? 'Speaking' : 'Listening'}
            </span>
          </div>
        );
      })}
    </section>
  );
}
