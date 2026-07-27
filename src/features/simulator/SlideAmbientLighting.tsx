'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getSlidePalette, type PresenterLightingState, type SlidePalette } from './slide-palette';

export interface SlideAmbientLightingProps {
  slideIndex: number;
  palette?: Partial<SlidePalette>;
  state: PresenterLightingState;
  className?: string;
}

export function SlideAmbientLighting({ slideIndex, palette, state, className }: SlideAmbientLightingProps) {
  const activePalette = useMemo(() => getSlidePalette(slideIndex, palette), [slideIndex, palette]);

  const stateModifierClass = useMemo(() => {
    switch (state) {
      case 'examiner_speaking':
        return 'ambient-glow-panel';
      case 'speaking':
        return 'ambient-glow-user';
      case 'listening':
        return 'ambient-glow-idle opacity-20';
      case 'idle':
      default:
        return 'ambient-glow-idle';
    }
  }, [state]);

  return (
    <div
      aria-hidden="true"
      data-testid="slide-ambient-lighting"
      data-state={state}
      className={cn(
        'ambient-glow transition-all duration-700 ease-out',
        stateModifierClass,
        className,
      )}
      style={
        {
          '--ambient-glow-color': activePalette.primary,
        } as React.CSSProperties
      }
    />
  );
}
