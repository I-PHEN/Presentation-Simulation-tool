'use client';

import React from 'react';
import { useAudioFrequencyData } from '@/hooks/use-audio-frequency-data';

export { useAudioFrequencyData };
export type { UseAudioFrequencyDataOptions } from '@/hooks/use-audio-frequency-data';

export interface AudioVisualizerProps {
  stream?: MediaStream;
  audioNode?: AudioNode;
  isActive?: boolean;
  type?: 'input' | 'output';
  variant?: 'mic' | 'speaker';
  barCount?: number;
  className?: string;
}

export function AudioVisualizer({
  stream,
  audioNode,
  isActive = false,
  type,
  variant,
  barCount = 5,
  className = '',
}: AudioVisualizerProps) {
  // Map type / variant according to interface contract
  const visualizerType: 'input' | 'output' =
    type ?? (variant === 'speaker' ? 'output' : 'input');

  const frequencies = useAudioFrequencyData({
    stream,
    audioNode,
    isActive,
    barCount,
  });

  const hasRealData = frequencies.length === barCount && frequencies.some((v) => v > 0);
  const bars = Array.from({ length: barCount }, (_, i) => i);

  // Styling design tokens:
  // - input (mic): vibrant microphone glow (emerald/cyan design tokens)
  // - output (Cartesia TTS): distinct Cartesia voice speaking glow (violet/indigo/primary design tokens)
  const activeColorClass =
    visualizerType === 'input'
      ? 'bg-gradient-to-t from-emerald-500 to-cyan-400 dark:from-emerald-400 dark:to-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.6),0_0_20px_rgba(16,185,129,0.4)]'
      : 'bg-gradient-to-t from-indigo-500 to-violet-400 dark:from-indigo-400 dark:to-violet-300 shadow-[0_0_10px_rgba(139,92,246,0.6),0_0_20px_rgba(99,102,241,0.4)]';

  return (
    <div className={`flex items-center justify-center gap-[3px] h-5 ${className}`}>
      {bars.map((barIndex) => {
        const duration = 0.4 + (barIndex % 3) * 0.25;
        const delay = (barIndex * 0.12).toFixed(2);
        const freqVal = frequencies[barIndex] ?? 0;
        const dynamicHeightPercent = Math.max(15, Math.min(100, Math.round(freqVal * 100)));

        return (
          <span
            key={barIndex}
            className={`w-[3px] rounded-full transition-all duration-200 ${
              isActive
                ? activeColorClass
                : 'bg-muted-foreground/30 h-1.5'
            }`}
            style={
              isActive
                ? hasRealData
                  ? { height: `${dynamicHeightPercent}%` }
                  : {
                      height: '100%',
                      animation: `sp-eq ${duration}s ease-in-out infinite alternate`,
                      animationDelay: `${delay}s`,
                    }
                : { height: '6px' }
            }
          />
        );
      })}
    </div>
  );
}
