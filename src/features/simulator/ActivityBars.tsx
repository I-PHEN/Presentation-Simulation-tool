'use client';

import { useAudioFrequencyData } from '@/hooks/use-audio-frequency-data';
import { cn } from '@/lib/utils';

export interface ActivityBarsProps {
  active?: boolean;
  isActive?: boolean;
  stream?: MediaStream;
  audioNode?: AudioNode;
  type?: 'input' | 'output';
  className?: string;
}

/**
 * Multi-band activity bars that rise and fall dynamically when an audio stream or
 * audio node is active, and fall back to smooth keyframe equalizer animations when active.
 * Inherits global reduced-motion rules.
 */
export function ActivityBars({
  active = false,
  isActive,
  stream,
  audioNode,
  type,
  className,
}: ActivityBarsProps) {
  const isCurrentlyActive = isActive ?? active;
  const frequencies = useAudioFrequencyData({
    stream,
    audioNode,
    isActive: isCurrentlyActive,
    barCount: 4,
  });

  const hasRealData = frequencies.length === 4 && frequencies.some((v) => v > 0);

  const glowColorClass =
    type === 'input'
      ? 'bg-emerald-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
      : type === 'output'
        ? 'bg-violet-500 dark:bg-indigo-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]'
        : 'bg-current shadow-[0_0_8px_currentColor]';

  return (
    <span aria-hidden="true" className={cn('flex h-3.5 shrink-0 items-end gap-[2px]', className)}>
      {[0, 1, 2, 3].map((bar) => {
        const freqVal = frequencies[bar] ?? 0;
        const dynamicHeightPercent = Math.max(20, Math.min(100, Math.round(freqVal * 100)));

        return (
          <span
            key={bar}
            className={cn(
              'w-[2.5px] origin-bottom rounded-full transition-all duration-200',
              isCurrentlyActive
                ? `${glowColorClass} ${
                    hasRealData ? '' : 'h-3.5 animate-[sp-eq_800ms_ease-in-out_infinite]'
                  }`
                : 'h-[3px] opacity-40',
            )}
            style={
              isCurrentlyActive
                ? hasRealData
                  ? { height: `${dynamicHeightPercent}%` }
                  : {
                      animationDelay: `${bar * 120}ms`,
                      animationDuration: `${600 + (bar % 2) * 300}ms`,
                    }
                : undefined
            }
          />
        );
      })}
    </span>
  );
}
