'use client';

import { useState } from 'react';
import type { DeckContext, DefenseMode, ExaminerStance } from '@/features/defense/types';

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
    <section aria-labelledby="practice-setup-title" className="border-y border-border py-8 sm:py-10">
      <div className="border-b border-border pb-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Practice setup</p>
        <h1 id="practice-setup-title" className="mt-2 text-3xl font-semibold tracking-tight">Set the conditions for this defense</h1>
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
              <label key={value} className={`cursor-pointer border px-4 py-3 text-left text-sm font-medium hover:bg-muted has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-foreground ${mode === value ? 'border-foreground bg-muted' : 'border-border'}`}>
                <input type="radio" name="practice-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="py-6">
          <legend className="text-base font-medium">Examiner stance</legend>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Rigorous examiners probe assumptions and evidence. Supportive examiners ask clear questions while still testing your understanding.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([
              ['rigorous', 'Rigorous'],
              ['supportive', 'Supportive'],
            ] as const).map(([value, label]) => (
              <label key={value} className={`cursor-pointer border px-4 py-3 text-left text-sm font-medium hover:bg-muted has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-foreground ${stance === value ? 'border-foreground bg-muted' : 'border-border'}`}>
                <input type="radio" name="examiner-stance" value={value} checked={stance === value} onChange={() => setStance(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <button type="button" disabled={saving} onClick={() => void continueToRoom()} className="mt-6 w-full border border-foreground bg-foreground px-4 py-3 text-sm font-medium text-background hover:opacity-85 disabled:opacity-60">
        {saving ? 'Saving setup...' : 'Continue to voice rehearsal'}
      </button>
    </section>
  );
}
