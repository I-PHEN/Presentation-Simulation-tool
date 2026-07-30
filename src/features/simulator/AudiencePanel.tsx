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

/** Gradient palette for each persona avatar — lightweight, CSS-only. */
const AVATAR_GRADIENTS: Record<string, string> = {
  professor: 'from-indigo-500 to-purple-600',
  examiner: 'from-amber-500 to-orange-600',
  peer: 'from-emerald-500 to-teal-600',
  sarah: 'from-rose-500 to-pink-600',
  marcus: 'from-blue-600 to-indigo-700',
};

/** Mood emoji that subtly indicates persona engagement — fully static, no overhead. */
function personaMoodBadge(personaId: string, isSpeaking: boolean): string {
  if (isSpeaking) return '💬';
  const moods: Record<string, string> = { professor: '🎓', examiner: '🔍', peer: '👁️', sarah: '🎓', marcus: '🎓' };
  return moods[personaId] ?? '👤';
}

/**
 * Lightweight avatar — a gradient circle with initial + a small floating mood badge.
 * Zero WebGL, zero canvas, zero images. Pure CSS.
 */
function PersonaAvatar({ persona, isSpeaking }: { persona: Persona; isSpeaking: boolean }) {
  const gradient = AVATAR_GRADIENTS[persona.id] ?? 'from-slate-500 to-slate-600';
  return (
    <div className="relative">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm transition-shadow duration-300',
          gradient,
          isSpeaking && 'ring-2 ring-primary ring-offset-1 ring-offset-background shadow-lg',
        )}
      >
        {persona.title.charAt(0)}
      </span>
      <span
        className="absolute -bottom-0.5 -right-0.5 text-[10px] leading-none select-none"
        aria-hidden="true"
      >
        {personaMoodBadge(persona.id, isSpeaking)}
      </span>
    </div>
  );
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
          <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white shadow-sm',
            you.active && 'ring-2 ring-primary ring-offset-1 ring-offset-background')}>
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
            <PersonaAvatar persona={persona} isSpeaking={speaking} />
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

      {/* Room Temperature & Tension Meter */}
      <div className="mt-1 rounded-xl glass-panel p-3">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span className="text-muted-foreground uppercase tracking-wider font-mono text-[10px]">Room Mood</span>
          <span className={cn('font-semibold', speakingPersonaId ? 'text-amber-500' : 'text-emerald-500')}>
            {speakingPersonaId ? 'Probing / High Pressure' : 'Listening'}
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Skepticism</span>
            <span>{speakingPersonaId ? '78%' : '35%'}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500 rounded-full', speakingPersonaId ? 'bg-amber-500 w-[78%]' : 'bg-primary/60 w-[35%]')}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

