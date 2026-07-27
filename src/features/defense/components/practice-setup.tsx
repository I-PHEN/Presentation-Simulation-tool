'use client';

import { useState } from 'react';
import type { DeckContext, DefenseMode, ExaminerStance, CurveballFrequency, PracticeSettings } from '@/features/defense/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Fetcher = typeof fetch;

const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  curveballFrequency: 'medium',
  showRoomMood: true,
  showPersonaBadges: true,
};

export async function savePracticeSetup({
  sessionId,
  mode,
  stance,
  practiceSettings,
  fetcher = fetch,
  onReady,
}: {
  sessionId: string;
  mode: DefenseMode;
  stance: ExaminerStance;
  practiceSettings?: PracticeSettings;
  fetcher?: Fetcher;
  onReady: () => void;
}) {
  const response = await fetcher(`/api/session/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, stance, ...(practiceSettings ? { practiceSettings } : {}) }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : 'Unable to save your practice setup.');
  }
  onReady();
}

function ToggleSwitch({ id, checked, onChange, label, description }: {
  id: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow ring-0 transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium">{label}</label>
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
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
  const [practiceSettings, setPracticeSettings] = useState<PracticeSettings>(DEFAULT_PRACTICE_SETTINGS);

  const updateSetting = <K extends keyof PracticeSettings>(key: K, value: PracticeSettings[K]) => {
    setPracticeSettings((prev) => ({ ...prev, [key]: value }));
  };

  const continueToRoom = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await savePracticeSetup({
        sessionId,
        mode,
        stance,
        practiceSettings: stance === 'hostile' ? practiceSettings : undefined,
        onReady,
      });
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

        {/* Advanced settings — only shown for hostile stance */}
        {stance === 'hostile' && (
          <fieldset className="py-6" data-testid="hostile-settings">
            <legend className="text-base font-medium">🎛️ Hostile mode settings</legend>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Fine-tune the intensity of your hostile rehearsal experience.</p>

            <div className="mt-5 space-y-5">
              {/* Curveball frequency */}
              <div>
                <label htmlFor="curveball-frequency" className="block text-sm font-medium">Curveball frequency</label>
                <p className="mt-0.5 text-xs text-muted-foreground">How often the examiner throws surprise interjections and curveball questions.</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([
                    ['low', 'Low'],
                    ['medium', 'Medium'],
                    ['high', 'High'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateSetting('curveballFrequency', value)}
                      className={cn(
                        'rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-popover',
                        practiceSettings.curveballFrequency === value
                          ? 'border-destructive bg-destructive/10 text-destructive'
                          : 'bg-surface',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room mood meter toggle */}
              <ToggleSwitch
                id="toggle-room-mood"
                checked={practiceSettings.showRoomMood}
                onChange={(val) => updateSetting('showRoomMood', val)}
                label="Room mood meters"
                description="Show real-time Skepticism and Hostility gauges during rehearsal."
              />

              {/* Persona badges toggle */}
              <ToggleSwitch
                id="toggle-persona-badges"
                checked={practiceSettings.showPersonaBadges}
                onChange={(val) => updateSetting('showPersonaBadges', val)}
                label="Persona status badges"
                description="Show lightweight persona indicators for each panelist in the audience."
              />
            </div>
          </fieldset>
        )}
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <button type="button" disabled={saving} onClick={() => void continueToRoom()} className={cn(buttonVariants({ size: 'lg' }), 'mt-6 w-full')}>
        {saving ? 'Saving setup...' : 'Continue to voice rehearsal'}
      </button>
    </section>
  );
}
