'use client';

import { useRef, useState } from 'react';
import type { DeckContext, DefenseMode, ExaminerStance } from '@/features/defense/types';
import { parseUploadedDeck } from './deck-intake';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { buttonVariants } from '@/components/ui/button';
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

const MODES: ReadonlyArray<readonly [DefenseMode, string, string]> = [
  ['diagnostic', 'Diagnostic practice', 'Pauses on weak reasoning so you can repair it before moving on.'],
  ['mock', 'Mock defense', 'Keeps the examination moving under realistic pressure, start to finish.'],
];

const STANCES: ReadonlyArray<readonly [ExaminerStance, string, string]> = [
  ['rigorous', 'Rigorous', 'Probes your assumptions and evidence hard.'],
  ['supportive', 'Supportive', 'Asks clear questions while still testing your understanding.'],
];

const ACCEPT =
  '.pptx,.ppt,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf';

const RADIO_CARD =
  'cursor-pointer rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-popover has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary';

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
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
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

  const start = () => {
    if (!deck) return;
    onStart({ deck, title, mode, stance });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <header>
        <p className="text-xs font-medium text-muted-foreground">New rehearsal</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-medium tracking-tight">Set up your rehearsal</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Two quick decisions: what are you rehearsing, and who is in the room.
        </p>
      </header>

      <section aria-labelledby="rehearse-step-source" className="rounded-xl border border-border bg-card p-6 shadow-e1 sm:p-8">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground">01</span>
          <h2 id="rehearse-step-source" className="text-base font-medium">What are you rehearsing?</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Upload the deck you will present. We render every slide and keep its text as defense evidence.
        </p>

        {!deck ? (
          <div className="mt-5 rounded-lg border border-border bg-surface/60 p-6">
            <label htmlFor="rehearse-deck" className="text-sm font-medium">Presentation deck (PPTX, PPT, or PDF)</label>
            <input
              id="rehearse-deck"
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={(event) => chooseFile(event.target.files?.[0])}
              className="mt-3 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground file:shadow-e1 hover:file:bg-primary/90"
            />
            {processing && <p className="mt-4 text-sm text-muted-foreground" role="status">Processing your deck. Rendering slides and extracting text...</p>}
            {uploadError && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
                <p>{uploadError.message}</p>
                {uploadError.retryable && file && (
                  <button type="button" onClick={() => void upload(file)} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-2')}>
                    Retry upload
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label htmlFor="rehearse-title" className="text-sm font-medium">Title</label>
                <input
                  id="rehearse-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
                />
                <p className="mt-2 text-xs text-muted-foreground">{deck.slides.length} slides ready.</p>
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} className={cn(buttonVariants({ variant: 'secondary' }), 'w-fit')}>Replace deck</button>
            </div>
            <input ref={inputRef} className="sr-only" type="file" accept={ACCEPT} onChange={(event) => chooseFile(event.target.files?.[0])} />
            <ol className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {deck.slides.map((slide) => (
                <li key={slide.index} className="shrink-0">
                  <AuthenticatedSlideImage source={slide.imageUrl} alt={`Slide ${slide.index}`} className="h-20 w-32 rounded-lg border border-border object-cover" />
                  <span className="mt-1 block text-center font-mono text-[11px] text-muted-foreground">{String(slide.index).padStart(2, '0')}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section
        aria-labelledby="rehearse-step-room"
        className={cn('rounded-xl border border-border bg-card p-6 shadow-e1 transition-opacity sm:p-8', !deck && 'opacity-60')}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground">02</span>
          <h2 id="rehearse-step-room" className="text-base font-medium">Who is in the room?</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Set how the examiner should challenge you. You can change this next time.</p>

        <fieldset className="mt-5" disabled={!deck}>
          <legend className="text-sm font-medium">Practice mode</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MODES.map(([value, label, help]) => (
              <label key={value} className={cn(RADIO_CARD, mode === value && 'border-primary bg-accent shadow-e1')}>
                <input type="radio" name="rehearse-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{help}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6" disabled={!deck}>
          <legend className="text-sm font-medium">Examiner stance</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {STANCES.map(([value, label, help]) => (
              <label key={value} className={cn(RADIO_CARD, stance === value && 'border-primary bg-accent shadow-e1')}>
                <input type="radio" name="rehearse-stance" value={value} checked={stance === value} onChange={() => setStance(value)} className="sr-only" />
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{help}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {startError && <p role="alert" className="text-sm text-destructive">{startError}</p>}
      <button type="button" disabled={!deck || creating} onClick={start} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
        {creating ? 'Starting rehearsal...' : 'Start rehearsal'}
      </button>
    </div>
  );
}
