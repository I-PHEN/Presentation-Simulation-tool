'use client';

import type { Persona } from './personas';
import { cn } from '@/lib/utils';

/** Roster only — what the panel is saying lives in the stage caption, so this
 * stays compact enough to share one screen with the transcript. */
export function AudiencePanel({ panel, speakingPersonaId }: {
  panel: Persona[]; speakingPersonaId: string | null;
}) {
  return (
    <section aria-label="Audience panel" className="flex shrink-0 flex-col gap-2">
      {panel.map((persona) => {
        const speaking = persona.id === speakingPersonaId;
        return (
          <div key={persona.id} data-state={speaking ? 'speaking' : 'listening'}
            className={cn('flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors',
              speaking && 'border-l-2 border-l-primary')}>
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              speaking ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
              {persona.title.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{persona.title}</p>
              <p className="truncate text-xs text-muted-foreground">{persona.focus}</p>
            </div>
            <span className={cn('ml-auto shrink-0 text-[11px] font-medium', speaking ? 'text-primary' : 'text-muted-foreground')}>
              {speaking ? 'Speaking' : 'Listening'}
            </span>
          </div>
        );
      })}
    </section>
  );
}
