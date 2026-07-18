'use client';

import { useRef, useState } from 'react';
import type { DeckContext } from '@/features/defense/types';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export function parseUploadedDeck(response: unknown): DeckContext | null {
  if (!response || typeof response !== 'object' || !('deck' in response)) return null;
  const deck = response.deck;
  if (!deck || typeof deck !== 'object' || !('sourceName' in deck) || !('slides' in deck)) return null;
  if (typeof deck.sourceName !== 'string' || !deck.sourceName.trim() || !Array.isArray(deck.slides)) return null;
  if (!deck.slides.every((slide) => slide && typeof slide === 'object' && 'index' in slide && 'text' in slide && 'imageUrl' in slide && Number.isInteger(slide.index) && slide.index > 0 && typeof slide.text === 'string' && typeof slide.imageUrl === 'string')) return null;
  return { sourceName: deck.sourceName, slides: deck.slides as DeckContext['slides'] };
}

export function beginDeckReplacement(onDeckInvalidated?: () => void) {
  onDeckInvalidated?.();
}

export function DeckIntake({ onDeckReady, onDeckInvalidated }: { onDeckReady: (deck: DeckContext) => void; onDeckInvalidated?: () => void }): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deck, setDeck] = useState<DeckContext | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null);
  const accept = '.pptx,.ppt,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf';

  const upload = async (selectedFile: File) => {
    setProcessing(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const response = await authenticatedFetch('/api/upload-presentation', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        setError({ message: data.error || 'The deck could not be processed.', retryable: Boolean(data.retryable) });
        return;
      }
      const readyDeck = parseUploadedDeck(data);
      if (!readyDeck) {
        setError({ message: 'The upload response did not contain a valid deck. Please choose a different file.', retryable: false });
        return;
      }
      setDeck(readyDeck);
      onDeckReady(readyDeck);
    } catch {
      setError({ message: 'The upload could not reach the server. Please try again.', retryable: true });
    } finally {
      setProcessing(false);
    }
  };

  const chooseFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    beginDeckReplacement(onDeckInvalidated);
    setFile(selectedFile);
    setDeck(null);
    void upload(selectedFile);
  };

  if (deck) return <section className="border-y border-border py-8 sm:py-10" aria-label="Deck receipt"><div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Deck received</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">{deck.sourceName}</h1><p className="mt-2 text-sm text-muted-foreground">{deck.slides.length} slides ready for review.</p></div><button type="button" onClick={() => inputRef.current?.click()} className="w-fit border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Replace deck</button></div><input ref={inputRef} className="sr-only" type="file" accept={accept} onChange={(event) => chooseFile(event.target.files?.[0])} /><ol className="divide-y divide-border">{deck.slides.map((slide) => <li key={slide.index} className="flex gap-4 py-4"><span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{String(slide.index).padStart(2, '0')}</span><img src={slide.imageUrl} alt={`Slide ${slide.index}`} className="h-16 w-28 border border-border object-cover" /><p className="line-clamp-3 text-sm leading-5 text-muted-foreground">{slide.text || 'No extracted speaker text.'}</p></li>)}</ol></section>;

  return <section className="border-y border-border py-8 sm:py-10"><p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Deck intake</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Import the deck you will defend</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Upload a PPTX, PPT, or PDF. We will render the slides and preserve their text as defense evidence.</p><div className="mt-8 border-t border-border pt-6"><label htmlFor="defense-deck" className="text-sm font-medium">Defense deck (PPTX, PPT, or PDF)</label><input id="defense-deck" type="file" accept={accept} onChange={(event) => chooseFile(event.target.files?.[0])} className="mt-3 block w-full text-sm file:mr-4 file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-medium file:text-background" />{processing && <p className="mt-4 text-sm text-muted-foreground" role="status">Processing your deck. Rendering slides and extracting text...</p>}{error && <div className="mt-4 border-l-2 border-destructive pl-3 text-sm" role="alert"><p>{error.message}</p>{error.retryable && file && <button type="button" onClick={() => void upload(file)} className="mt-2 font-medium underline underline-offset-4">Retry upload</button>}</div>}</div></section>;
}
