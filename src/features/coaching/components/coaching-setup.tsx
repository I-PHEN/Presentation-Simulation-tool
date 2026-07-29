'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, Sparkles, Upload, Loader2, Check, ArrowRight,
  Zap, FileText, Layers, ShieldCheck, Volume2
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore, PROMPT_TEMPLATE_CHIPS } from '@/lib/store';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { toast } from 'sonner';
import type { DeckContext } from '@/features/defense/types';
import { parseUploadedDeck } from '@/features/defense/components/deck-intake';

const ACCEPT = '.pptx,.ppt,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf';

export function CoachingSetup() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    coachPersona, setCoachPersona,
    presenterDirectives, setPresenterDirectives,
    explanationDepth, setExplanationDepth,
    setPracticeMode,
  } = useAppStore();

  const [deck, setDeck] = useState<DeckContext | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [sourceType, setSourceType] = useState<'deck' | 'topic'>('deck');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authenticatedFetch('/api/upload-presentation', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const parsed = parseUploadedDeck(data);
      if (parsed) {
        setDeck(parsed);
        if (!title) setTitle(parsed.sourceName.replace(/\.[^/.]+$/, ''));
        toast.success(`Deck uploaded successfully (${parsed.slides.length} slides)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload deck');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartCoaching = async () => {
    setIsCreating(true);
    try {
      setPracticeMode('guided');

      const payload = {
        title: title || (sourceType === 'deck' ? deck?.sourceName || 'Masterclass Rehearsal' : topic || 'Executive Pitch'),
        mode: 'guided',
        stance: 'supportive',
        deck: sourceType === 'deck' ? deck : undefined,
        topic: sourceType === 'topic' ? topic : undefined,
        customConfig: {
          coachPersona,
          presenterDirectives,
          explanationDepth,
        },
      };

      const res = await authenticatedFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.sessionId) throw new Error(data.error || 'Failed to create session');

      toast.success('Entering Masterclass Executive Studio');
      router.push(`/coaching/${data.sessionId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to launch coaching session');
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Hero Header */}
      <div className="p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-indigo-950/40 to-slate-950 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            <Sparkles className="size-3.5" /> MASTERCLASS COACHING STUDIO
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Executive Delivery & Telemetry Studio
          </h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-xl leading-relaxed">
            Rehearse slide-by-slide with your personal AI Communication Coach. Get real-time vocal weight feedback, pace telemetry, live teleprompter scripts, and Coach Rescue voiceovers.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 shrink-0">
          <div className="size-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">1-on-1 Mentorship</div>
            <div className="text-[10px] text-slate-400">No panel interruptions</div>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Material Intake */}
        <div className="lg:col-span-7 space-y-6">
          {/* Source Selector: Deck vs Topic */}
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileText className="size-4 text-amber-400" /> 1. Select Presentation Material
              </label>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSourceType('deck')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                    sourceType === 'deck' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  )}
                >
                  Slide Deck (.pptx)
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('topic')}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
                    sourceType === 'topic' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  )}
                >
                  Topic Prompt
                </button>
              </div>
            </div>

            {sourceType === 'deck' ? (
              <div>
                {!deck ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-8 text-center bg-slate-950/40 hover:bg-slate-900/60 transition-all cursor-pointer space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    {isProcessing ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="size-8 animate-spin text-amber-400" />
                        <p className="text-xs font-semibold text-amber-300">Extracting slide layouts & typography...</p>
                      </div>
                    ) : (
                      <>
                        <div className="size-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                          <Upload className="size-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Click to upload your PowerPoint (.pptx / .pdf)</p>
                          <p className="text-xs text-slate-400 mt-1">High-fidelity layout extraction & AI teleprompter generation</p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        PPTX
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{deck.sourceName}</div>
                        <div className="text-[10px] text-amber-300">{deck.slides.length} slides parsed</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setDeck(null)} className="text-xs text-slate-400 hover:text-white">
                      Replace
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Q3 Investor Update, Academic Defense of LLM Quantization, Startup Seed Pitch..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:border-amber-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Presenter Directives & Prompt Chips */}
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400" /> 2. Presenter Directives (Prompt Instructions)
            </label>
            <p className="text-xs text-slate-400">Click a template or type your specific goals for Coach Marcus/Sarah</p>

            <div className="flex flex-wrap gap-2">
              {PROMPT_TEMPLATE_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPresenterDirectives(chip.text)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs font-medium text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-all"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <textarea
              value={presenterDirectives}
              onChange={(e) => setPresenterDirectives(e.target.value)}
              className="w-full min-h-[90px] text-xs p-3 rounded-xl border border-slate-800 bg-slate-950 text-white focus:border-amber-500 outline-none resize-none leading-relaxed"
              placeholder="e.g., Help me sound calm and authoritative. Make sure I emphasize our $2M seed budget on Slide 3 and explain the ROI clearly without rushing..."
            />
          </div>
        </div>

        {/* Right Column: Coach Persona & Telemetry Settings */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          {/* Coach Persona Selector */}
          <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <GraduationCap className="size-4 text-amber-400" /> 3. Select AI Communication Coach
            </label>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => setCoachPersona('marcus')}
                className={cn(
                  'w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3',
                  coachPersona === 'marcus'
                    ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                )}
              >
                <div className="size-9 rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  CM
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Coach Marcus (Male Voice)</div>
                  <div className="text-[10px] text-slate-400 leading-tight">Executive Delivery Specialist — Polished, authoritative executive coach</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCoachPersona('sarah')}
                className={cn(
                  'w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3',
                  coachPersona === 'sarah'
                    ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900'
                )}
              >
                <div className="size-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  CS
                </div>
                <div>
                  <div className="font-bold text-xs text-white">Coach Sarah (Female Voice)</div>
                  <div className="text-[10px] text-slate-400 leading-tight">Presentation Strategist — Warm, encouraging master strategist</div>
                </div>
              </button>
            </div>
          </div>

          {/* Explanation Depth Selector */}
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="size-4 text-amber-400" /> 4. Explanation Depth Focus
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'surface', label: 'Overview', desc: 'High-level' },
                { id: 'balanced', label: 'Balanced', desc: 'Executive' },
                { id: 'deep', label: 'Technical', desc: 'Dense detail' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setExplanationDepth(item.id as any)}
                  className={cn(
                    'p-2.5 rounded-xl border text-center transition-all',
                    explanationDepth === item.id
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  )}
                >
                  <div className="text-xs">{item.label}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Launch Button */}
          <Button
            size="lg"
            onClick={handleStartCoaching}
            disabled={isCreating || (sourceType === 'deck' && !deck) || (sourceType === 'topic' && !topic.trim())}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Launching Masterclass Studio...
              </>
            ) : (
              <>
                Enter Masterclass Studio <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
