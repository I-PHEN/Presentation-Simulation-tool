'use client';

import { useCallback, useRef, useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { createSTT, generateTTS, playAudioData, unlockAudio } from '@/lib/voice-engine';
import { analyseReading } from '@/features/defense/reading-analysis';
import { spokenBySlide } from '@/features/defense/transcript';
import { useExaminerVoice } from '@/features/defense/hooks/use-examiner-voice';
import { createRehearsalRoomController, type CaptureStart } from './rehearsal-room-controller';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { AuthenticatedSlideImage } from '@/lib/authenticated-asset';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';

type RehearsalSession = { id: string; deck: DeckContext; mode: DefenseMode; stance: ExaminerStance; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; status: string };
type STTHandle = Awaited<ReturnType<typeof createSTT>>;

export function RehearsalRoom({ session, onComplete }: { session: RehearsalSession; onComplete: () => void }) {
  const [, render] = useState(0);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [interim, setInterim] = useState('');
  const [captureState, setCaptureState] = useState<'idle' | 'listening' | 'paused'>('idle');
  const [savingError, setSavingError] = useState<string | null>(null);
  const captureRef = useRef<STTHandle | null>(null);
  const pendingCommitRef = useRef<Promise<unknown>>(Promise.resolve());
  const controllerRef = useRef<ReturnType<typeof createRehearsalRoomController> | null>(null);
  const startedAtRef = useRef(0);

  const stopCapture = useCallback(async () => {
    const capture = captureRef.current;
    captureRef.current = null;
    if (capture) await capture.stop();
    // This is intentionally presenter persistence only. Examiner delivery is
    // scheduled by the controller after this promise settles.
    await pendingCommitRef.current;
    setInterim('');
  }, []);
  const startCapture = useCallback(async (start: CaptureStart) => {
    setMicrophoneError(null);
    try {
      const controller = controllerRef.current;
      if (!controller) return;
      captureRef.current = await createSTT(setInterim, (text) => {
        const segment: TranscriptSegment = { role: 'presenter', slideIndex: start.slideIndex, text: text.trim(), startedAtMs: start.startedAtMs, endedAtMs: Math.max(start.startedAtMs, Date.now() - startedAtRef.current) };
        pendingCommitRef.current = controller.commit(segment);
      });
      captureRef.current.start();
      setCaptureState('listening');
    } catch {
      setCaptureState('idle');
      setMicrophoneError('Microphone access was unavailable. Check permission and retry.');
    }
  }, []);
  const pauseCapture = useCallback(async () => { setCaptureState('paused'); await stopCapture(); }, [stopCapture]);
  const resumeCapture = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller) return;
    const state = controller.getState();
    if (state.started && !state.ended) await startCapture({ slideIndex: state.slideIndex, startedAtMs: Math.max(0, Date.now() - startedAtRef.current) });
  }, [startCapture]);
  const voice = useExaminerVoice({
    pauseCapture, resumeCapture, generateSpeech: generateTTS, playSpeech: playAudioData,
    appendSegment: async (segment) => { await controllerRef.current?.appendExaminerSegment(segment); },
    now: () => Math.max(0, Date.now() - startedAtRef.current),
  });
  if (!controllerRef.current) {
    controllerRef.current = createRehearsalRoomController({
      mode: session.mode, now: () => Date.now(), initialSlideIndex: session.deck.slides[0].index, initialSegments: session.transcriptSegments, initialEvents: session.examinerEvents,
      persist: async (segments, events, status) => {
        const response = await authenticatedFetch(`/api/session/${session.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcriptSegments: segments, examinerEvents: events, status }) });
        if (!response.ok) { const body = await response.json().catch(() => ({})); const message = typeof body.error === 'string' ? body.error : 'Your rehearsal could not be saved. Retry before finishing.'; setSavingError(message); throw new Error(message); }
        setSavingError(null);
      },
      startCapture, stopCapture,
      requestExaminer: async (segment) => {
        const state = controllerRef.current!.getState();
        const evidence = analyseReading(session.deck.slides, spokenBySlide(state.segments)).find((item) => item.slideIndex === segment.slideIndex);
        const response = await authenticatedFetch('/api/defense/examiner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.id, currentSegment: segment, readingEvidence: evidence }) });
        const body = await response.json().catch(() => ({}));
        return response.ok && body.event ? body.event as ExaminerEvent : null;
      },
      speak: voice.speak, onComplete, onChange: () => render((value) => value + 1),
    });
  }
  const controller = controllerRef.current;
  const state = controller.getState();
  const slidePosition = Math.max(0, session.deck.slides.findIndex((slide) => slide.index === state.slideIndex));
  const slide = session.deck.slides[slidePosition];
  const queuedEvent = state.events[state.queueIndex];
  const begin = async () => { unlockAudio(); startedAtRef.current = Date.now(); await controller.start(); };
  const end = async () => { try { await controller.end(); setCaptureState('idle'); } catch (error) { setSavingError(error instanceof Error ? error.message : 'Your rehearsal could not be saved.'); } };
  const changeSlide = async (position: number) => { await controller.changeSlide(session.deck.slides[position].index); };

  return <div className="min-h-dvh bg-background text-foreground">
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur sm:px-6"><a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Exit rehearsal</a><p className="min-w-0 truncate text-sm font-medium">{session.deck.sourceName}</p><div className="flex items-center gap-3"><span className="text-sm text-muted-foreground">Slide {slidePosition + 1} of {session.deck.slides.length}</span><ThemeToggle /></div></header>
    <main className="mx-auto grid w-full max-w-[1600px] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-6">
      <section aria-label="Active presentation slide" className="min-w-0"><div className="relative rounded-xl border border-border bg-card p-2 shadow-e2 before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary before:to-transparent after:absolute after:inset-0 after:-z-10 after:rounded-xl after:bg-primary/10 after:blur-2xl"><div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted/30"><AuthenticatedSlideImage source={slide.imageUrl} alt={`Slide ${slidePosition + 1}: ${slide.text}`} className="h-full w-full object-contain" /><span className="absolute right-3 top-3 rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[11px] backdrop-blur">{String(slidePosition + 1).padStart(2, '0')} / {String(session.deck.slides.length).padStart(2, '0')}</span></div></div><p className="mt-3 px-1 text-sm text-muted-foreground">{slide.text}</p></section>
      <aside aria-label="Examiner rail" className="rounded-xl border border-border bg-card p-5 shadow-e1"><p className="text-xs font-medium text-muted-foreground">Examiner</p><h1 className="mt-2 font-display text-lg font-medium">{voice.lastCaption ? 'Examiner speaking' : 'Examiner listening'}</h1><p className="mt-4 text-sm leading-6">{voice.lastCaption ?? 'The examiner will listen for a grounded point to question.'}</p>{voice.lastEvent && <p className="mt-4 rounded-lg border border-border bg-surface/60 p-4 text-sm leading-6 text-muted-foreground">{voice.lastEvent.evidence}</p>}{queuedEvent && state.answeringQuestion && session.mode === 'mock' && <button type="button" disabled={!state.answerCommitted} onClick={() => void controller.continueQuestion()} className={cn(buttonVariants({ size: 'default' }), 'mt-5 w-full')}>Continue after answer</button>}<button type="button" onClick={() => void voice.replayLast()} className={cn(buttonVariants({ variant: 'secondary' }), 'mt-3 w-full')}>Replay last question</button>{voice.lastError && <p role="alert" className="mt-3 text-sm text-destructive">{voice.lastError}</p>}<button type="button" onClick={() => void voice.replayLast()} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-2', voice.lastError ? '' : 'hidden')}>Retry audio</button></aside>
    </main>
    <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur sm:px-6"><div className="text-sm text-muted-foreground">{captureState === 'listening' ? `Microphone listening${interim ? `: ${interim}` : ''}` : captureState === 'paused' ? 'Microphone paused for examiner' : 'Microphone idle'}</div>{microphoneError && <div role="alert" className="text-sm text-destructive">{microphoneError}</div>}{savingError && <div role="alert" className="text-sm text-destructive">{savingError}</div>}<button type="button" onClick={() => void startCapture({ slideIndex: state.slideIndex, startedAtMs: Math.max(0, Date.now() - startedAtRef.current) })} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), microphoneError ? '' : 'hidden')}>Retry microphone</button><div className="flex gap-2"><button type="button" aria-label="Previous slide" onClick={() => void changeSlide(Math.max(0, slidePosition - 1))} disabled={slidePosition === 0} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>Previous slide</button><button type="button" aria-label="Next slide" onClick={() => void changeSlide(Math.min(session.deck.slides.length - 1, slidePosition + 1))} disabled={slidePosition === session.deck.slides.length - 1} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>Next slide</button></div><button type="button" disabled={state.started} onClick={() => void begin()} className={cn(buttonVariants({ size: 'default' }), state.started ? 'hidden' : '')}>Start presentation</button><button type="button" disabled={!state.started || state.ended || state.answeringQuestion} onClick={() => void end()} className={cn(buttonVariants({ variant: 'secondary', size: 'default' }), state.started ? '' : 'hidden')}>End presentation</button>{state.ended && <button type="button" disabled={!controller.canFinish() || Boolean(savingError)} onClick={controller.finish} className={cn(buttonVariants({ size: 'default' }), controller.canFinish() ? '' : 'hidden')}>Finish session</button>}</footer>
  </div>;
}
