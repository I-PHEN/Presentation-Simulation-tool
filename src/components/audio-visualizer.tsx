'use client';

import React from 'react';

interface AudioVisualizerProps {
  isActive?: boolean;
  variant?: 'mic' | 'speaker';
  barCount?: number;
  className?: string;
}

export function AudioVisualizer({
  isActive = false,
  variant = 'mic',
  barCount = 5,
  className = '',
}: AudioVisualizerProps) {
  const bars = Array.from({ length: barCount }, (_, i) => i);
  const activeColor = variant === 'mic' ? 'bg-primary' : 'bg-emerald-500';
  const glowColor = variant === 'mic' ? 'shadow-primary/50' : 'shadow-emerald-500/50';

  return (
    <div className={`flex items-center justify-center gap-[3px] h-5 ${className}`}>
      {bars.map((barIndex) => {
        // Vary animation durations and delays for a realistic multi-band frequency look
        const duration = 0.4 + (barIndex % 3) * 0.25;
        const delay = (barIndex * 0.12).toFixed(2);

        return (
          <span
            key={barIndex}
            className={`w-[3px] rounded-full transition-all duration-200 ${
              isActive
                ? `${activeColor} shadow-[0_0_8px] ${glowColor}`
                : 'bg-muted-foreground/30 h-1.5'
            }`}
            style={
              isActive
                ? {
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
