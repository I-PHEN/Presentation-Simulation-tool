'use client';

import type { Persona } from './personas';
import { cn } from '@/lib/utils';

export function AudiencePanel({ panel, speakingPersonaId, caption }: {
  panel: Persona[]; speakingPersonaId: string | null; caption: string | null;
}) {
  return (
    <section aria-label="Audience panel" className="flex flex-col gap-3">
      {panel.map((persona) => {
        const speaking = persona.id === speakingPersonaId;
        return (
          <div key={persona.id} data-state={speaking ? 'speaking' : 'listening'}
            className={cn('rounded-xl border border-border bg-card p-4 transition-colors',
              speaking && 'border-l-2 border-l-primary')}>
            <div className="flex items-center gap-3">
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                speaking ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                {persona.title.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{persona.title}</p>
                <p className="truncate text-xs text-muted-foreground">{persona.focus}</p>
              </div>
              <span className="ml-auto text-[11px] font-medium text-muted-foreground">
                {speaking ? 'Speaking' : 'Listening'}
              </span>
            </div>
            {speaking && caption && <p className="mt-3 text-sm leading-6">{caption}</p>}
          </div>
        );
      })}
    </section>
  );
}
