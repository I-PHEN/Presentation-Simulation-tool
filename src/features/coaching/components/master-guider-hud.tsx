'use client';

import {
  GraduationCap, Sparkles, Zap, CheckCircle2, Circle, AlertTriangle,
  RefreshCw, Layers
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
  const {
    coachPersona,
    presenterDirectives,
    explanationDepth,
    customDirectivesChecklist,
    toggleDirectiveCompleted,
  } = useAppStore();

  const coachName = coachPersona === 'sarah' ? 'Coach Sarah' : 'Coach Marcus';
  const coachTitle = coachPersona === 'sarah' ? 'Presentation Strategist' : 'Executive Delivery Specialist';

  let pacingStatus: { label: string; color: string; bg: string } = {
    label: 'Optimal Pace (130-150 WPM)',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  };

  if (wpm > 0 && wpm < 110) {
    pacingStatus = {
      label: 'Slowing Down (<110 WPM)',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/30',
    };
  } else if (wpm > 170) {
    pacingStatus = {
      label: 'Rushing Pace (>170 WPM)',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/30',
    };
  }

  const getDepthLabel = () => {
    switch (explanationDepth) {
      case 'surface': return 'High-Level Overview';
      case 'deep': return 'Dense Technical Breakdown';
      default: return 'Balanced Executive Depth';
    }
  };

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 text-foreground shadow-sm space-y-4">
      {/* Top Header: Coach Persona */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm">
            <GraduationCap className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-foreground">{coachName}</h3>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground border border-border">
                Coach
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{coachTitle}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-mono text-muted-foreground">PROGRESS</span>
          <p className="text-xs font-bold text-foreground">{currentSlide + 1} <span className="text-muted-foreground">/ {Math.max(1, totalSlides)}</span></p>
        </div>
      </div>

      {/* Active Coach Speech Bubble */}
      {coachSpeechBubble && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-xs space-y-1.5 animate-fade-in">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
            <Sparkles className="size-3" /> {coachName} Voice Advice:
          </div>
          <p className="text-foreground italic leading-relaxed text-[11px]">
            &ldquo;{coachSpeechBubble}&rdquo;
          </p>
        </div>
      )}

      {/* Telemetry Pillar 1: Vocal Weight / Depth */}
      <div className="space-y-1.5 rounded-lg bg-surface p-2.5 border border-border">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <Layers className="size-3 text-primary" /> Explanation Depth
          </span>
          <span className="font-medium text-muted-foreground">{getDepthLabel()}</span>
        </div>
        <div className="grid grid-cols-3 gap-1 pt-1">
          <div className={`h-1.5 rounded-full transition-all ${explanationDepth === 'surface' ? 'bg-sky-500' : 'bg-muted'}`} />
          <div className={`h-1.5 rounded-full transition-all ${explanationDepth === 'balanced' ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-1.5 rounded-full transition-all ${explanationDepth === 'deep' ? 'bg-purple-500' : 'bg-muted'}`} />
        </div>
      </div>

      {/* Telemetry Pillar 2: Tempo */}
      <div className="space-y-1.5 rounded-lg bg-surface p-2.5 border border-border">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <Zap className="size-3 text-primary" /> Live Speech Tempo
          </span>
          <span className="font-mono text-foreground">{wpm > 0 ? `${wpm} WPM` : 'Measuring...'}</span>
        </div>
        <div className={`rounded-md border px-2.5 py-1 text-[10px] font-medium flex items-center justify-between ${pacingStatus.bg}`}>
          <span className={pacingStatus.color}>{pacingStatus.label}</span>
          {wpm > 170 && <AlertTriangle className="size-3 text-amber-500 animate-pulse" />}
        </div>
      </div>

      {/* Telemetry Pillar 3: Presenter Directives */}
      {presenterDirectives && (
        <div className="space-y-2 rounded-lg bg-surface p-2.5 border border-border">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Sparkles className="size-3 text-primary" /> Presenter Goal Directives
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground italic bg-muted/40 p-2 rounded border border-border leading-relaxed">
            &ldquo;{presenterDirectives}&rdquo;
          </p>

          {customDirectivesChecklist.length > 0 && (
            <div className="space-y-1 pt-1">
              {customDirectivesChecklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleDirectiveCompleted(item.id)}
                  className="flex items-center gap-2 w-full text-left text-[10px] p-1 rounded hover:bg-muted/50 transition-colors"
                >
                  {item.completed ? (
                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="size-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className={item.completed ? 'text-muted-foreground line-through' : 'text-foreground'}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action 1: Ask Coach for Advice */}
      {onAskCoachAdvice && (
        <Button
          size="sm"
          variant="default"
          onClick={onAskCoachAdvice}
          disabled={isAdviceLoading}
          className="w-full h-8 text-xs font-medium bg-primary text-primary-foreground shadow-sm"
        >
          {isAdviceLoading ? (
            <><RefreshCw className="size-3.5 animate-spin mr-1.5" /> Coach Analyzing Speech...</>
          ) : (
            <><Sparkles className="size-3.5 mr-1.5" /> Ask {coachName} for Delivery Advice</>
          )}
        </Button>
      )}

      {/* Action 2: Coach Rescue */}
      <Button
        size="sm"
        variant="outline"
        onClick={onCoachRescue}
        disabled={isRescueLoading}
        className="w-full h-8 text-xs font-medium"
      >
        {isRescueLoading ? (
          <><RefreshCw className="size-3.5 animate-spin mr-1.5" /> Generating Pitch Script...</>
        ) : (
          <><Sparkles className="size-3.5 text-primary mr-1.5" /> Coach Rescue: Model Pitch Script</>
        )}
      </Button>
    </div>
  );
}
