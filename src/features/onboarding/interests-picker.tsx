'use client';

import { useState } from 'react';
import { INTEREST_OPTIONS } from './interests';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function InterestsPicker({
  selected,
  onToggle,
  onAddCustom,
  onContinue,
  onSkip,
  saving = false,
}: {
  selected: string[];
  onToggle: (label: string) => void;
  onAddCustom: (label: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  saving?: boolean;
}): React.ReactElement {
  const [custom, setCustom] = useState('');
  const isSelected = (label: string) => selected.some((item) => item.toLowerCase() === label.toLowerCase());
  const extras = selected.filter((item) => !INTEREST_OPTIONS.some((option) => option.toLowerCase() === item.toLowerCase()));
  const submitCustom = () => {
    const value = custom.trim();
    if (!value) return;
    onAddCustom(value);
    setCustom('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
        {[...INTEREST_OPTIONS, ...extras].map((label) => (
          <button
            key={label}
            type="button"
            aria-pressed={isSelected(label)}
            onClick={() => onToggle(label)}
            className={cn(
              'rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-popover focus-visible:outline-none focus-visible:shadow-focus',
              isSelected(label) && 'border-primary bg-accent text-accent-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="custom-interest" className="text-sm font-medium">Add your own</label>
          <input
            id="custom-interest"
            type="text"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitCustom(); } }}
            placeholder="e.g. Quantum computing"
            className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
          />
        </div>
        <button type="button" onClick={submitCustom} className={cn(buttonVariants({ variant: 'secondary' }))}>Add</button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onSkip} className={cn(buttonVariants({ variant: 'ghost' }))}>Skip for now</button>
        <button type="button" onClick={onContinue} disabled={saving} className={cn(buttonVariants({ size: 'lg' }))}>
          {saving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
