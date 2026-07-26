'use client';

import { cn } from '@/lib/utils';

/**
 * Three bars that rise and fall while a voice is active, and sit flat when it is
 * not. Driven entirely by real room state (who is speaking, whether the
 * recogniser is producing words) — it is a state indicator, not a fabricated
 * level meter, and it inherits the global reduced-motion rule.
 */
export function ActivityBars({ active, className }: { active: boolean; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('flex h-3.5 shrink-0 items-end gap-[2px]', className)}>
      {[0, 1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={cn(
            'w-[2.5px] origin-bottom rounded-full bg-current transition-all duration-200',
            active
              ? 'h-3.5 animate-[sp-eq_800ms_ease-in-out_infinite] shadow-[0_0_8px_currentColor]'
              : 'h-[3px] opacity-40',
          )}
          style={active ? { animationDelay: `${bar * 120}ms`, animationDuration: `${600 + (bar % 2) * 300}ms` } : undefined}
        />
      ))}
    </span>
  );
}

