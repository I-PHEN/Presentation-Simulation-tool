'use client';

import { useRef, useSyncExternalStore } from 'react';
import type { ExaminerEvent, TranscriptSegment } from '@/features/defense/types';
import type { AudioPlayResult } from '@/lib/voice-engine';

export interface PanelVoiceState {
  /** The words revealed so far — this is what the subtitle renders. */
  caption: string | null;
  /** The whole line, for assistive tech and for measuring progress. */
  captionFull: string | null;
  captionDone: boolean;
  /** Stays set after speaking ends, so the last subtitle keeps its attribution. */
  captionPersonaId: string | null;
  speakingPersonaId: string | null;
  lastEvent: ExaminerEvent | null;
  lastError: string | null;
}

export type PanelTranscriptSegment = TranscriptSegment & { delivery: 'audio' | 'caption-fallback' };

export interface PanelVoiceDependencies {
  pauseCapture: () => void | Promise<void>;
  resumeCapture: () => void | Promise<void>;
  generateSpeech: (text: string, voiceId: string) => Promise<unknown>;
  /** `onDuration` lets the player report the clip length so the caption can be paced to it. */
  playSpeech: (audio: unknown, onDuration?: (durationMs: number) => void) => Promise<AudioPlayResult>;
  appendSegment: (segment: PanelTranscriptSegment) => void | Promise<void>;
  defaultVoiceId: string;
  voiceForPersona?: (personaId: string) => string;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

const replayError = 'Audio could not play. Use replay to try again.';
/** ~185 wpm — the pace we reveal at until the real clip length arrives. */
const ESTIMATED_WORD_MS = 325;
const MIN_WORD_MS = 60;

export function createPanelVoiceController(deps: PanelVoiceDependencies) {
  let state: PanelVoiceState = { caption: null, captionFull: null, captionDone: false, captionPersonaId: null, speakingPersonaId: null, lastEvent: null, lastError: null };
  const attempted = new Set<string>();
  const failedAppend = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const setState = (next: Partial<PanelVoiceState>) => { state = { ...state, ...next }; emit(); };
  const voiceFor = (personaId: string | undefined) =>
    (personaId && deps.voiceForPersona?.(personaId)) || deps.defaultVoiceId;
  const eventKey = (e: ExaminerEvent) => [e.kind, e.slideIndex, e.occurredAtMs, e.text, e.evidence].join('|');

  // --- Progressive caption reveal -------------------------------------------
  // Words appear one at a time like video subtitles. We start on an estimated
  // pace the moment we know what will be said, then re-pace to the true clip
  // length once the player reports it, and snap to the full line when the audio
  // (or the attempt to play it) is over.
  const setTimer = (fn: () => void, ms: number) => (deps.setTimer ?? setTimeout)(fn, ms);
  const clearTimer = (handle: unknown) => (deps.clearTimer ?? clearTimeout)(handle as ReturnType<typeof setTimeout>);

  let timer: unknown = null;
  let words: string[] = [];
  let shown = 0;

  const stopTimer = () => { if (timer !== null) clearTimer(timer); timer = null; };
  const revealed = () => words.slice(0, shown).join(' ');

  const scheduleNextWord = (perWordMs: number) => {
    stopTimer();
    if (shown >= words.length) return;
    timer = setTimer(() => {
      timer = null;
      shown += 1;
      setState({ caption: revealed(), captionDone: shown >= words.length });
      scheduleNextWord(perWordMs);
    }, Math.max(MIN_WORD_MS, perWordMs));
  };

  const startReveal = (text: string, personaId: string | null) => {
    stopTimer();
    words = text.split(/\s+/).filter(Boolean);
    shown = words.length > 0 ? 1 : 0;
    setState({ caption: revealed(), captionFull: text, captionDone: shown >= words.length, captionPersonaId: personaId });
    scheduleNextWord(ESTIMATED_WORD_MS);
  };

  /** Spread whatever is left of the line across whatever is left of the audio. */
  const repaceToAudio = (durationMs: number) => {
    if (!Number.isFinite(durationMs) || durationMs <= 0 || shown >= words.length) return;
    scheduleNextWord(durationMs / words.length);
  };

  const finishReveal = () => {
    stopTimer();
    if (words.length === 0) return;
    shown = words.length;
    setState({ caption: revealed(), captionDone: true });
  };

  const appendOnce = async (event: ExaminerEvent, delivery: PanelTranscriptSegment['delivery']): Promise<boolean> => {
    const key = eventKey(event);
    if (attempted.has(key)) return !failedAppend.has(key);
    attempted.add(key);
    try {
      await deps.appendSegment({
        role: 'examiner', slideIndex: event.slideIndex, text: event.text,
        startedAtMs: event.occurredAtMs, endedAtMs: deps.now?.() ?? event.occurredAtMs, delivery,
      });
      return true;
    } catch {
      failedAppend.add(key);
      return false;
    }
  };

  const speak = async (event: ExaminerEvent): Promise<AudioPlayResult> => {
    await deps.pauseCapture();
    setState({ speakingPersonaId: event.persona?.id ?? null, lastEvent: event, lastError: null });
    try {
      const audio = await deps.generateSpeech(event.text, voiceFor(event.persona?.id));
      startReveal(event.text, event.persona?.id ?? null);
      const result = await deps.playSpeech(audio, repaceToAudio);
      if (result.played) {
        if (!(await appendOnce(event, 'audio'))) { setState({ lastError: replayError }); return { played: false, error: 'playback' }; }
        return result;
      }
      startReveal(event.text, event.persona?.id ?? null);
      await appendOnce(event, 'caption-fallback');
      setState({ lastError: replayError });
      return result;
    } catch {
      startReveal(event.text, event.persona?.id ?? null);
      await appendOnce(event, 'caption-fallback');
      setState({ lastError: replayError });
      return { played: false, error: 'playback' };
    } finally {
      finishReveal();
      setState({ speakingPersonaId: null });
      await deps.resumeCapture();
    }
  };

  const speakIntro = async (intro: { personaId: string; voiceId: string; text: string }): Promise<AudioPlayResult> => {
    setState({ speakingPersonaId: intro.personaId, lastError: null });
    try {
      const audio = await deps.generateSpeech(intro.text, intro.voiceId);
      startReveal(intro.text, intro.personaId);
      const result = await deps.playSpeech(audio, repaceToAudio);
      if (!result.played) setState({ lastError: replayError });
      return result;
    } catch {
      startReveal(intro.text, intro.personaId);
      setState({ lastError: replayError });
      return { played: false, error: 'playback' };
    } finally {
      finishReveal();
      setState({ speakingPersonaId: null });
    }
  };

  const enqueue = async (item: { id?: string; personaId?: string; text: string; slideIndex?: number; interrupts?: boolean }): Promise<AudioPlayResult> => {
    const persona = item.personaId ? { id: item.personaId, title: item.personaId === 'sarah' ? 'Coach Sarah' : item.personaId === 'marcus' ? 'Coach Marcus' : 'Coach' } : undefined;
    return speak({
      kind: 'question',
      slideIndex: item.slideIndex ?? 0,
      text: item.text,
      occurredAtMs: deps.now?.() ?? 0,
      persona,
    });
  };

  return {
    speak,
    speakIntro,
    enqueue,
    replayLast: async () => (state.lastEvent ? speak(state.lastEvent) : ({ played: false, error: 'playback' } as AudioPlayResult)),
    getState: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

export function usePanelVoice(deps: PanelVoiceDependencies) {
  const ref = useRef<ReturnType<typeof createPanelVoiceController> | null>(null);
  if (!ref.current) ref.current = createPanelVoiceController(deps);
  const controller = ref.current;
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  return { ...controller, state };
}
