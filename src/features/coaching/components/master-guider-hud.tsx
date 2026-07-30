'use client';

import {
  GraduationCap, Sparkles, Zap, RefreshCw, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

interface MasterGuiderHudProps {
  currentSlide: number;
  totalSlides: number;
  wpm: number;
  transcript: string;
  onCoachRescue: () => void;
  onAskCoachAdvice?: () => void;
  isRescueLoading?: boolean;
  isAdviceLoading?: boolean;
  coachSpeechBubble?: string | null;
}

export default function MasterGuiderHud({
  currentSlide,
  totalSlides,
  wpm,
  transcript,
  onCoachRescue,
  onAskCoachAdvice,
  isRescueLoading = false,
  isAdviceLoading = false,
  coachSpeechBubble,
}: MasterGuiderHudProps) {
  const { coachPersona } = useAppStore();

  const coachName = coachPersona === 'sarah' ? 'Coach Sarah' : 'Coach Marcus';
  const coachTitle = coachPersona === 'sarah' ? 'Executive Presentation Strategist' : 'Senior Communication Coach';

  let pacingStatus = {
    label: 'Optimal Cadence (130-150 WPM)',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  };

  if (wpm > 0 && wpm < 110) {
    pacingStatus = {
      label: 'Deliberate Pace (<110 WPM)',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/30',
    };
  } else if (wpm > 170) {
    pacingStatus = {
      label: 'Fast Pace (>170 WPM)',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
    };
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card/90 p-4 text-foreground shadow-sm space-y-4">
      {/* Header: Coach Persona */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow">
            <GraduationCap className="size-5" />
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-foreground">{coachName}</h3>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary border border-primary/20">
                AI Coach
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{coachTitle}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Slide</span>
          <p className="text-xs font-bold text-foreground">{currentSlide + 1} <span className="text-muted-foreground font-normal">/ {Math.max(1, totalSlides)}</span></p>
        </div>
      </div>

      {/* Spoken Advice Speech Bubble */}
      {coachSpeechBubble && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/25 text-xs space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between text-[10px] font-semibold text-primary">
            <span className="flex items-center gap-1.5"><Sparkles className="size-3" /> {coachName} Guidance</span>
            <Volume2 className="size-3 text-primary/80" />
          </div>
          <p className="text-foreground italic leading-relaxed text-[11px]">
            &ldquo;{coachSpeechBubble}&rdquo;
          </p>
        </div>
      )}

      {/* Vocal Pacing & Cadence Gauge */}
      <div className="space-y-1.5 rounded-lg bg-muted/40 p-2.5 border border-border/60">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-medium text-foreground flex items-center gap-1">
            <Zap className="size-3 text-primary" /> Live Speech Tempo
          </span>
          <span className="font-mono text-xs font-semibold text-foreground">{wpm > 0 ? `${wpm} WPM` : 'Measuring...'}</span>
        </div>
        <div className={`rounded-md border px-2.5 py-1 text-[10px] font-medium flex items-center justify-between ${pacingStatus.bg}`}>
          <span className={pacingStatus.color}>{pacingStatus.label}</span>
        </div>
      </div>

      {/* Single Primary Action: Ask Coach */}
      {onAskCoachAdvice && (
        <Button
          size="sm"
          onClick={onAskCoachAdvice}
          disabled={isAdviceLoading}
          className="w-full h-9 text-xs font-semibold bg-primary text-primary-foreground shadow flex items-center justify-center gap-1.5"
        >
          {isAdviceLoading ? (
            <><RefreshCw className="size-3.5 animate-spin" /> Analyzing Speech & Pacing...</>
          ) : (
            <><Sparkles className="size-3.5" /> Ask {coachName} for Advice</>
          )}
        </Button>
      )}

      {/* Secondary Action: Model Pitch Script */}
      <Button
        size="sm"
        variant="outline"
        onClick={onCoachRescue}
        disabled={isRescueLoading}
        className="w-full h-8 text-xs font-medium text-muted-foreground border-border hover:bg-muted/50"
      >
        {isRescueLoading ? (
          <><RefreshCw className="size-3.5 animate-spin mr-1.5" /> Generating Pitch Script...</>
        ) : (
          <><Sparkles className="size-3.5 text-primary mr-1.5" /> Model Pitch Script</>
        )}
      </Button>
    </div>
  );
}
