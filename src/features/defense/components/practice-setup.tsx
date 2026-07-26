'use client';

import { useState } from 'react';
import type { DeckContext, DefenseMode, ExaminerStance } from '@/features/defense/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Fetcher = typeof fetch;

export async function savePracticeSetup({
  sessionId,
  mode,
  stance,
  fetcher = fetch,
  onReady,
}: {
  sessionId: string;
  mode: DefenseMode;
  stance: ExaminerStance;
  fetcher?: Fetcher;
  onReady: () => void;
}) {
  const response = await fetcher(`/api/session/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, stance }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : 'Unable to save your practice setup.');
  }
  onReady();
}

export function PracticeSetup({
  sessionId,
  deck,
  initialMode = 'diagnostic',
  initialStance = 'rigorous',
  onReady,
}: {
  sessionId: string;
  deck: DeckContext;
  initialMode?: DefenseMode;
  initialStance?: ExaminerStance;
  onReady: () => void;
}) {
  const [mode, setMode] = useState<DefenseMode>(initialMode);
  const [stance, setStance] = useState<ExaminerStance>(initialStance);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const continueToRoom = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await savePracticeSetup({ sessionId, mode, stance, onReady });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your practice setup.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="practice-setup-title" className="rounded-xl border border-border bg-card p-6 shadow-e1 sm:p-8">
      <div className="border-b border-border pb-6">
        <p className="text-xs font-medium text-muted-foreground">Practice setup</p>
        <h1 id="practice-setup-title" className="mt-2 font-display text-3xl sm:text-4xl font-medium tracking-tight">Set the conditions for this defense</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{deck.sourceName} is ready. Choose how the room should challenge your explanation.</p>
      </div>

      <div className="divide-y divide-border">
        <fieldset className="py-6">
          <legend className="text-base font-medium">Practice mode</legend>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Diagnostic practice pauses on weak reasoning so you can repair it. Mock defense keeps the examination moving under realistic pressure.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([
              ['diagnostic', 'Diagnostic practice'],
              ['mock', 'Mock defense'],
            ] as const).map(([value, label]) => (
              <label key={value} className={cn('cursor-pointer rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-popover has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary', mode === value && 'border-primary bg-accent shadow-e1')}>
                <input type="radio" name="practice-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="py-6">
          <legend className="text-base font-medium">Examiner stance</legend>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Choose your room pressure level. Hostile Heckler mode challenges premises aggressively with curveballs and frequent interjections.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {([
              ['rigorous', 'Rigorous'],
              ['supportive', 'Supportive'],
              ['hostile', '🔥 Hostile Heckler'],
            ] as const).map(([value, label]) => (
              <label key={value} className={cn(
                'cursor-pointer rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-popover has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary',
                stance === value && (value === 'hostile' ? 'border-destructive bg-destructive/10 text-destructive shadow-e1' : 'border-primary bg-accent shadow-e1'),
              )}>
                <input type="radio" name="examiner-stance" value={value} checked={stance === value} onChange={() => setStance(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <button type="button" disabled={saving} onClick={() => void continueToRoom()} className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-full')}>
        {saving ? 'Saving setup...' : 'Continue to voice rehearsal'}
      </button>
    </section>
  );
}
