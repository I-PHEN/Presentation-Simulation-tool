'use client';

import { useRef, useState, type DragEvent } from 'react';
import {
  Upload, FileText, CheckCircle2, Zap, Activity, Flame,
  ShieldAlert, Sparkles, Clock, Play, ArrowRight, Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import type { DeckContext, DefenseMode, ExaminerStance } from '@/features/defense/types';
import { parseUploadedDeck } from './deck-intake';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RehearseConfig {
  deck: DeckContext;
  title: string;
  mode: DefenseMode;
  stance: ExaminerStance;
}

export function buildRehearseSessionPayload({ deck, title, mode, stance }: RehearseConfig) {
  const trimmed = title.trim();
  return { title: trimmed.length > 0 ? trimmed : deck.sourceName, mode, stance, deck };
}

const MODES: ReadonlyArray<readonly [DefenseMode, string, string, typeof Zap]> = [
  ['uninterrupted', 'Uninterrupted presentation', 'Present your whole deck at your own pace without mid-slide interruptions.', Activity],
  ['diagnostic', 'Diagnostic sparring', 'Pauses on weak reasoning so you can repair it before moving on.', Zap],
  ['mock', 'Mock defense', 'Keeps the examination moving under realistic pressure, start to finish.', Flame],
];

const STANCES: ReadonlyArray<readonly [ExaminerStance, string, string, typeof ShieldAlert]> = [
  ['rigorous', 'Rigorous', 'Probes your assumptions and evidence hard.', ShieldAlert],
  ['supportive', 'Supportive', 'Asks clear questions while still testing your understanding.', Sparkles],
];

const ACCEPT =
  '.pptx,.ppt,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf';

export function RehearseSetup({
  creating = false,
  startError,
  onStart,
  onDeckChange,
  uploadFetcher = authenticatedFetch,
}: {
  creating?: boolean;
  startError?: string;
  onStart: (config: RehearseConfig) => void;
  onDeckChange?: () => void;
  uploadFetcher?: typeof fetch;
}): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deck, setDeck] = useState<DeckContext | null>(null);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<DefenseMode>('diagnostic');
  const [stance, setStance] = useState<ExaminerStance>('rigorous');
  const [targetDuration, setTargetDuration] = useState<number | undefined>(10);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<{ message: string; retryable: boolean } | null>(null);

  const upload = async (selectedFile: File) => {
    setProcessing(true);
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await uploadFetcher('/api/upload-presentation', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        setUploadError({ message: data.error || 'The deck could not be processed.', retryable: Boolean(data.retryable) });
        return;
      }
      const readyDeck = parseUploadedDeck(data);
      if (!readyDeck) {
        setUploadError({ message: 'The upload response did not contain a valid deck. Please choose a different file.', retryable: false });
        return;
      }
      setDeck(readyDeck);
      setTitle((current) => (current.trim().length > 0 ? current : readyDeck.sourceName));
    } catch {
      setUploadError({ message: 'The upload could not reach the server. Please try again.', retryable: true });
    } finally {
      setProcessing(false);
    }
  };

  const chooseFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    onDeckChange?.();
    setFile(selectedFile);
    setDeck(null);
    void upload(selectedFile);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) chooseFile(droppedFile);
  };

  const start = () => {
    if (!deck) return;
    onStart({ deck, title, mode, stance });
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
          Upload your presentation deck and define the room parameters for your AI panel examination.
        </p>
      </header>

      {/* Step 01: Deck Intake */}
      <section aria-labelledby="rehearse-step-source" className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground">01</span>
          <h2 id="rehearse-step-source" className="text-base font-medium text-foreground">What are you rehearsing?</h2>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Upload your PowerPoint or PDF presentation. Every slide visual is extracted and preserved for live examination.
        </p>

        {!deck ? (
          <div className="mt-5 space-y-3">
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
                      Click to upload or drag & drop your presentation
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
          <div className="mt-5 space-y-4">
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
                  <span>{deck.slides.length} slides ready for examination</span>
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
                <span className="font-mono">{deck.slides.length} slides</span>
              </div>
              <ol className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {deck.slides.map((slide) => (
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
        )}
      </section>

      {/* Step 02: Room Parameters */}
      <section
        aria-labelledby="rehearse-step-room"
        className={cn('rounded-xl border border-border bg-card p-6 shadow-sm transition-all sm:p-8 space-y-6', !deck && 'opacity-60')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-muted-foreground">02</span>
            <h2 id="rehearse-step-room" className="text-base font-medium text-foreground">Who is in the room?</h2>
          </div>
          {!deck && (
            <span className="text-xs text-muted-foreground italic flex items-center gap-1">
              <FileText className="size-3.5" /> Upload a deck above to unlock
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground -mt-4">
          Set how the AI examiner panel should evaluate your pitch and challenge your reasoning.
        </p>

        {/* Practice Mode Radio Cards */}
        <fieldset disabled={!deck} className="space-y-3">
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
        <fieldset disabled={!deck} className="space-y-3">
          <legend className="text-xs font-semibold text-foreground uppercase tracking-wider">Examiner Stance</legend>
          <div className="grid gap-3 sm:grid-cols-2">
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

        {/* Target Presentation Duration */}
        <fieldset disabled={!deck} className="space-y-3">
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
        disabled={!deck || creating}
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
