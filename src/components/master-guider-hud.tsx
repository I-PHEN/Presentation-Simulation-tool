'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Sparkles, Zap, CheckCircle2, Circle, AlertTriangle,
  Volume2, HelpCircle, ArrowRight, RefreshCw, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

interface MasterGuiderHudProps {
  currentSlide: number;
  totalSlides: number;
  wpm: number;
  transcript: string;
  onCoachRescue: () => void;
  isRescueLoading?: boolean;
}

export default function MasterGuiderHud({
  currentSlide,
  totalSlides,
  wpm,
  transcript,
  onCoachRescue,
  isRescueLoading = false,
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

  // Calculate WPM pacing status
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

  // Determine active depth indicator
  const getDepthLabel = () => {
    switch (explanationDepth) {
      case 'surface': return 'High-Level Overview';
      case 'deep': return 'Dense Technical Breakdown';
      default: return 'Balanced Executive Depth';
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-950/85 backdrop-blur-md p-4 text-slate-100 shadow-2xl space-y-4">
      {/* Top Header: Coach Persona */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 font-bold text-white shadow-md">
            <GraduationCap className="size-5" />
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold tracking-tight text-white">{coachName}</h3>
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 border border-amber-500/30">
                MASTER GUIDER
              </span>
            </div>
            <p className="text-[10px] text-slate-400">{coachTitle}</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-medium text-slate-400">SLIDE</span>
          <p className="text-xs font-bold text-amber-400">{currentSlide + 1} <span className="text-slate-500">/ {Math.max(1, totalSlides)}</span></p>
        </div>
      </div>

      {/* Telemetry Pillar 1: Vocal Weight / Explanation Depth */}
      <div className="space-y-1.5 rounded-xl bg-slate-900/60 p-2.5 border border-slate-800">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Layers className="size-3 text-amber-400" /> Explanation Depth
          </span>
          <span className="font-bold text-amber-300">{getDepthLabel()}</span>
        </div>
        <div className="grid grid-cols-3 gap-1 pt-1">
          <div className={`h-1.5 rounded-full transition-all ${explanationDepth === 'surface' ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full transition-all ${explanationDepth === 'balanced' ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-slate-800'}`} />
          <div className={`h-1.5 rounded-full transition-all ${explanationDepth === 'deep' ? 'bg-purple-400 shadow-sm shadow-purple-400' : 'bg-slate-800'}`} />
        </div>
      </div>

      {/* Telemetry Pillar 2: Pacing & Tempo */}
      <div className="space-y-1.5 rounded-xl bg-slate-900/60 p-2.5 border border-slate-800">
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Zap className="size-3 text-amber-400" /> Live Tempo & Speed
          </span>
          <span className="font-bold text-slate-200">{wpm > 0 ? `${wpm} WPM` : 'Measuring...'}</span>
        </div>
        <div className={`rounded-lg border px-2.5 py-1 text-[10px] font-medium flex items-center justify-between ${pacingStatus.bg}`}>
          <span className={pacingStatus.color}>{pacingStatus.label}</span>
          {wpm > 170 && <AlertTriangle className="size-3 text-amber-400 animate-pulse" />}
        </div>
      </div>

      {/* Telemetry Pillar 3: Custom Presenter Directives Checklist */}
      {presenterDirectives && (
        <div className="space-y-2 rounded-xl bg-slate-900/60 p-2.5 border border-slate-800">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Sparkles className="size-3 text-amber-400" /> Presenter Goal Directives
            </span>
          </div>
          <p className="text-[10px] text-slate-300 italic bg-slate-950/60 p-2 rounded border border-slate-800/80 leading-relaxed">
            &ldquo;{presenterDirectives}&rdquo;
          </p>

          {customDirectivesChecklist.length > 0 && (
            <div className="space-y-1 pt-1">
              {customDirectivesChecklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleDirectiveCompleted(item.id)}
                  className="flex items-center gap-2 w-full text-left text-[10px] p-1.5 rounded hover:bg-slate-800/50 transition-colors"
                >
                  {item.completed ? (
                    <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="size-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className={item.completed ? 'text-emerald-300 line-through' : 'text-slate-300'}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Button: Coach Rescue & Model Script */}
      <Button
        size="sm"
        variant="outline"
        onClick={onCoachRescue}
        disabled={isRescueLoading}
        className="w-full h-9 text-xs font-bold border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        {isRescueLoading ? (
          <><RefreshCw className="size-3.5 animate-spin" /> Generating Executive Pitch Script...</>
        ) : (
          <><Sparkles className="size-3.5 text-amber-400" /> Coach Rescue: Model Pitch Script</>
        )}
      </Button>
    </div>
  );
}
