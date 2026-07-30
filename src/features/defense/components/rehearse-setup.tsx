'use client';

import { useRef, useState, type DragEvent, useEffect } from 'react';
import {
  Upload, FileText, CheckCircle2, Zap, Activity, Flame,
  ShieldAlert, Sparkles, Clock, Play, Loader2, RefreshCw, AlertCircle, MessageSquare
} from 'lucide-react';
import type { DeckContext, DefenseMode, ExaminerStance } from '@/features/defense/types';
import { parseUploadedDeck, getCachedDeck } from './deck-intake';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RehearseConfig {
  title?: string;
  stance: ExaminerStance;
  mode: DefenseMode;
  deck: DeckContext;
  targetDurationMinutes?: number;
  customInstruction?: string;
}

const ACCEPT = '.pptx,.ppt,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf';

const MODES: Array<[DefenseMode, string, string, typeof Zap]> = [
  ['uninterrupted', 'Uninterrupted presentation', 'Present without mid-slide interruptions. The AI panel takes notes quietly.', Zap],
  ['diagnostic', 'Diagnostic sparring', 'Interactive Q&A whenever weak evidence or low explanation depth is detected.', Activity],
  ['mock', 'Mock defense', 'Simulate a high-pressure examination room with frequent, realistic Q&A interruptions.', Flame],
];

const STANCES: Array<[ExaminerStance, string, string, typeof ShieldAlert]> = [
  ['rigorous', 'Rigorous', 'Challenging questions, testing your evidence & metrics hard.', ShieldAlert],
  ['supportive', 'Supportive', 'Guided, constructive questioning while testing understanding.', Sparkles],
  ['custom', 'Custom Persona', 'Define your own specialized AI examiner instructions or select a preset.', MessageSquare],
];

const PROMPT_PRESETS = [
  { id: 'interview', label: '💼 Job Interview / CV Defense', prompt: 'Act as a Senior Hiring Manager & Tech Recruiter examining my CV/Resume. Probe technical experience, STAR behavioral answers, and leadership evidence.' },
  { id: 'vc', label: '💰 VC Investor Pitch', prompt: 'Act as a Partner at a top-tier VC firm. Interrogate unit economics, TAM, market sizing, moat, and customer acquisition cost.' },
  { id: 'tech', label: '🛠️ System Architecture Review', prompt: 'Act as a Principal Software Architect. Question system design choices, scalability bottlenecks, security, and trade-offs.' },
  { id: 'thesis', label: '🎓 Academic Thesis Defense', prompt: 'Act as a PhD Examination Committee Chair. Question research methodology, literature gap, sample size, and statistical validity.' },
  { id: 'sales', label: '🛍️ Enterprise Sales Buyer', prompt: 'Act as a skeptical Enterprise Procurement Director. Probe pricing models, ROI timeline, SLA terms, and compliance.' },
];

export function buildRehearseSessionPayload({
  deck,
  title,
  mode,
  stance,
  targetDurationMinutes,
  customInstruction,
}: {
  deck: DeckContext;
  title?: string;
  mode: DefenseMode;
  stance: ExaminerStance;
  targetDurationMinutes?: number;
  customInstruction?: string;
}) {
  return {
    deck,
    title: title?.trim() || deck.sourceName,
    mode,
    stance,
    ...(targetDurationMinutes ? { targetDurationMinutes } : {}),
    ...(customInstruction?.trim() ? { customInstruction: customInstruction.trim() } : {}),
  };
}

export function RehearseSetup({
  onStart,
  creating = false,
  disabled = false,
  startError,
}: {
  onStart: (config: RehearseConfig) => void;
  creating?: boolean;
  disabled?: boolean;
  startError?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Source Type State: 'file' | 'text'
  const [sourceType, setSourceType] = useState<'file' | 'text'>('file');
  const [rawText, setRawText] = useState('');

  const [deck, setDeck] = useState<DeckContext | null>(null);
  const [cachedDeck, setCachedDeck] = useState<DeckContext | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<DefenseMode>('diagnostic');
  const [stance, setStance] = useState<ExaminerStance>('rigorous');
  const [customInstruction, setCustomInstruction] = useState('');
  const [targetDuration, setTargetDuration] = useState<number | undefined>(10);

  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<{ message: string; retryable: boolean } | null>(null);

  useEffect(() => {
    const cached = getCachedDeck();
    if (cached) {
      setCachedDeck(cached);
      // Auto-restore: if no fresh upload has happened yet, populate deck from cache
      setDeck((prev) => prev ?? cached);
      setTitle((prev) => prev || cached.sourceName);
    }
  }, []);

  const upload = async (selected: File) => {
    setFile(selected);
    setUploadError(null);
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selected);
      const res = await authenticatedFetch('/api/upload-presentation', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed. Please try again.');

      const parsed = parseUploadedDeck(data);
      if (!parsed) throw new Error('Invalid presentation response from server.');
      setDeck(parsed);
      setTitle(parsed.sourceName);
    } catch (err) {
      setUploadError({
        message: err instanceof Error ? err.message : 'Upload failed. Please try again.',
        retryable: true,
      });
      setDeck(null);
    } finally {
      setProcessing(false);
    }
  };

  const chooseFile = (selected?: File) => {
    if (!selected) return;
    void upload(selected);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) chooseFile(droppedFile);
  };

  const handleRawTextChange = (text: string) => {
    setRawText(text);
    if (text.trim().length > 0) {
      const trimmed = text.trim();
      const syntheticDeck: DeckContext = {
        sourceName: trimmed.slice(0, 50) + (trimmed.length > 50 ? '...' : ''),
        slides: [{ index: 1, text: trimmed, imageUrl: 'topic' }],
      };
      setDeck(syntheticDeck);
      setTitle(syntheticDeck.sourceName);
    } else {
      setDeck(null);
    }
  };

  const effectiveDeck = deck ?? cachedDeck;

  const start = () => {
    if (!effectiveDeck || creating) return;
    onStart({
      ...buildRehearseSessionPayload({
        deck: effectiveDeck,
        title,
        mode,
        stance,
        targetDurationMinutes: targetDuration,
        customInstruction,
      }),
    });
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl">
      {/* Header */}
      <header>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">01. Rehearsal Setup</p>
        <h1 className="mt-1 font-display text-3xl font-medium tracking-tight sm:text-4xl text-foreground">
          Configure Your Pitch Defense
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Upload your presentation deck, CV/Resume, or paste topic material, and define the room parameters for AI panel examination.
        </p>
      </header>

      {/* Step 01: Material Intake */}
      <section aria-labelledby="rehearse-step-source" className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-muted-foreground">01</span>
            <h2 id="rehearse-step-source" className="text-base font-medium text-foreground">What are you rehearsing?</h2>
          </div>
          <div className="flex rounded-lg border border-border bg-background p-1 text-xs">
            <button
              type="button"
              onClick={() => { setSourceType('file'); setDeck(null); }}
              className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', sourceType === 'file' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              Upload Document
            </button>
            <button
              type="button"
              onClick={() => { setSourceType('text'); setDeck(null); }}
              className={cn('px-3 py-1.5 rounded-md font-medium transition-colors', sourceType === 'text' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              Paste CV / Text
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {sourceType === 'file'
            ? 'Upload a PowerPoint (.pptx) deck, PDF presentation, or Resume document for slide-by-slide AI analysis.'
            : 'Paste your raw CV text, job description, or research argument directly into the box below.'}
        </p>

        {sourceType === 'file' ? (
          !effectiveDeck ? (
            <div className="space-y-3">
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'group relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer bg-surface/50 hover:bg-muted/40',
                  isDragging ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                )}
              >
                <input
                  id="rehearse-deck"
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                  className="sr-only"
                />

                {processing ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-3">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Rendering slides & extracting evidence...</p>
                      <p className="text-xs text-muted-foreground mt-1">Extracting slide layouts, text content, and visual assets</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Upload className="size-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Click to upload or drag & drop your presentation or CV
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Presentation deck (PPTX, PPT, or PDF)
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded border border-border bg-background text-[10px] font-mono text-muted-foreground">PPTX</span>
                      <span className="px-2 py-0.5 rounded border border-border bg-background text-[10px] font-mono text-muted-foreground">PDF</span>
                    </div>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-start gap-3" role="alert">
                  <AlertCircle className="size-5 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="font-medium">{uploadError.message}</p>
                    {uploadError.retryable && file && (
                      <button
                        type="button"
                        onClick={() => void upload(file)}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs text-destructive hover:bg-destructive/10')}
                      >
                        <RefreshCw className="size-3 mr-1.5" /> Retry upload
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between p-4 rounded-xl border border-border bg-surface">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="rehearse-title" className="text-xs font-semibold text-foreground uppercase tracking-wider">Presentation Title</label>
                  <input
                    id="rehearse-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-medium"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>{effectiveDeck!.slides.length} slides ready for examination</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0 text-xs')}
                >
                  Replace deck
                </button>
              </div>
              <input ref={inputRef} className="sr-only" type="file" accept={ACCEPT} onChange={(event) => chooseFile(event.target.files?.[0])} />

              {/* Slide Thumbnail Reel */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Slide Preview Gallery</span>
                  <span className="font-mono">{effectiveDeck!.slides.length} slides</span>
                </div>
                <ol className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                  {effectiveDeck!.slides.map((slide) => (
                    <li key={slide.index} className="shrink-0 group relative">
                      <div className="overflow-hidden rounded-lg border border-border bg-background transition-all group-hover:border-primary/50 group-hover:shadow-sm">
                        <AuthenticatedSlideImage
                          source={slide.imageUrl}
                          alt={`Slide ${slide.index}`}
                          className="h-20 w-32 object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                      <span className="mt-1 block text-center font-mono text-[10px] font-medium text-muted-foreground">
                        Slide {String(slide.index).padStart(2, '0')}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <label htmlFor="rehearse-raw-text" className="sr-only">Raw CV or Topic Text</label>
            <textarea
              id="rehearse-raw-text"
              rows={6}
              value={rawText}
              onChange={(e) => handleRawTextChange(e.target.value)}
              placeholder="Paste your Resume text, Job Description, or Presentation Topic argument here..."
              className="w-full rounded-xl border border-border bg-background p-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary leading-relaxed font-sans"
            />
            {deck && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Text material loaded for live Q&A examination</span>
              </p>
            )}
          </div>
        )}
      </section>

      {/* Step 02: Room Parameters */}
      <section
        aria-labelledby="rehearse-step-room"
        className={cn('rounded-xl border border-border bg-card p-6 shadow-sm transition-all sm:p-8 space-y-6', !effectiveDeck && 'opacity-60')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-muted-foreground">02</span>
            <h2 id="rehearse-step-room" className="text-base font-medium text-foreground">Who is in the room?</h2>
          </div>
          {!effectiveDeck && (
            <span className="text-xs text-muted-foreground italic flex items-center gap-1">
              <FileText className="size-3.5" /> Upload a deck or paste text above to unlock
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground -mt-4">
          Set how the AI examiner panel should evaluate your material and challenge your reasoning.
        </p>

        {/* Practice Mode Radio Cards */}
        <fieldset disabled={!effectiveDeck} className="space-y-3">
          <legend className="text-xs font-semibold text-foreground uppercase tracking-wider">Practice Mode</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {MODES.map(([value, label, help, Icon]) => {
              const selected = mode === value;
              return (
                <label
                  key={value}
                  className={cn(
                    'relative cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between text-left',
                    selected
                      ? 'border-primary bg-accent ring-1 ring-primary shadow-sm'
                      : 'border-border bg-surface hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <input
                    type="radio"
                    name="rehearse-mode"
                    value={value}
                    checked={selected}
                    onChange={() => setMode(value)}
                    className="sr-only"
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className={cn('p-2 rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                        <Icon className="size-4" />
                      </div>
                      {selected && <CheckCircle2 className="size-4 text-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{help}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Examiner Stance Radio Cards */}
        <fieldset disabled={!effectiveDeck} className="space-y-3">
          <legend className="text-xs font-semibold text-foreground uppercase tracking-wider">Examiner Stance</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {STANCES.map(([value, label, help, Icon]) => {
              const selected = stance === value;
              return (
                <label
                  key={value}
                  className={cn(
                    'relative cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-3 text-left',
                    selected
                      ? 'border-primary bg-accent ring-1 ring-primary shadow-sm'
                      : 'border-border bg-surface hover:bg-muted/40 text-muted-foreground'
                  )}
                >
                  <input
                    type="radio"
                    name="rehearse-stance"
                    value={value}
                    checked={selected}
                    onChange={() => setStance(value)}
                    className="sr-only"
                  />
                  <div className={cn('p-2 rounded-lg shrink-0', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      {selected && <CheckCircle2 className="size-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{help}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Custom Persona Text Area & Quick Chips */}
        {stance === 'custom' && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <label htmlFor="custom-instruction-box" className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" /> Specialized AI Examiner Instructions
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose a quick preset or type custom rules for your AI examiner (e.g. Job Interviewer, System Architect, VC Investor).
            </p>

            {/* Quick Chip Presets */}
            <div className="flex flex-wrap gap-2 pt-1">
              {PROMPT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setCustomInstruction(preset.prompt)}
                  className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <textarea
              id="custom-instruction-box"
              rows={3}
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g. Act as a Senior Google Hiring Manager. Grill me hard on my distributed systems architecture experience and test my STAR behavioral responses..."
              className="w-full rounded-lg border border-border bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary leading-relaxed font-sans"
            />
          </div>
        )}

        {/* Target Presentation Duration */}
        <fieldset disabled={!effectiveDeck} className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <legend className="text-xs font-semibold text-foreground uppercase tracking-wider">Target Presentation Duration</legend>
          </div>
          <p className="text-xs text-muted-foreground">Select your target presentation length for realistic pacing telemetry.</p>
          <div className="grid grid-cols-5 gap-2 pt-1">
            {[
              { mins: 5, label: '5 mins' },
              { mins: 10, label: '10 mins' },
              { mins: 15, label: '15 mins' },
              { mins: 20, label: '20 mins' },
              { mins: undefined, label: 'Unlimited' },
            ].map(({ mins, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setTargetDuration(mins)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all',
                  targetDuration === mins
                    ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary shadow-sm'
                    : 'border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      {/* Error & Start CTA */}
      {startError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2" role="alert">
          <AlertCircle className="size-4 shrink-0" />
          <span>{startError}</span>
        </div>
      )}

      <Button
        size="lg"
        disabled={!effectiveDeck || creating}
        onClick={start}
        className="w-full h-12 text-sm font-semibold flex items-center justify-center gap-2 rounded-xl shadow-sm"
      >
        {creating ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Starting rehearsal...
          </>
        ) : (
          <>
            <Play className="size-4 fill-current" /> Start rehearsal
          </>
        )}
      </Button>
    </div>
  );
}
