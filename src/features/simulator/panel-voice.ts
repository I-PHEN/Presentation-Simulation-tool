'use client';

import { useRef, useSyncExternalStore } from 'react';
import type { ExaminerEvent, TranscriptSegment } from '@/features/defense/types';
import type { AudioPlayResult } from '@/lib/voice-engine';

export interface PanelVoiceState {
  caption: string | null;
  speakingPersonaId: string | null;
  lastEvent: ExaminerEvent | null;
  lastError: string | null;
}

export type PanelTranscriptSegment = TranscriptSegment & { delivery: 'audio' | 'caption-fallback' };

export interface PanelVoiceDependencies {
  pauseCapture: () => void | Promise<void>;
  resumeCapture: () => void | Promise<void>;
  generateSpeech: (text: string, voiceId: string) => Promise<unknown>;
  playSpeech: (audio: unknown) => Promise<AudioPlayResult>;
  appendSegment: (segment: PanelTranscriptSegment) => void | Promise<void>;
  defaultVoiceId: string;
  voiceForPersona?: (personaId: string) => string;
  now?: () => number;
}

const replayError = 'Audio could not play. Use replay to try again.';

export function createPanelVoiceController(deps: PanelVoiceDependencies) {
  let state: PanelVoiceState = { caption: null, speakingPersonaId: null, lastEvent: null, lastError: null };
  const attempted = new Set<string>();
  const failedAppend = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const setState = (next: Partial<PanelVoiceState>) => { state = { ...state, ...next }; emit(); };
  const voiceFor = (personaId: string | undefined) =>
    (personaId && deps.voiceForPersona?.(personaId)) || deps.defaultVoiceId;
  const eventKey = (e: ExaminerEvent) => [e.kind, e.slideIndex, e.occurredAtMs, e.text, e.evidence].join('|');

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
    setState({ caption: event.text, speakingPersonaId: event.persona?.id ?? null, lastEvent: event, lastError: null });
    try {
      const audio = await deps.generateSpeech(event.text, voiceFor(event.persona?.id));
      const result = await deps.playSpeech(audio);
      if (result.played) {
        if (!(await appendOnce(event, 'audio'))) { setState({ lastError: replayError }); return { played: false, error: 'playback' }; }
        return result;
      }
      await appendOnce(event, 'caption-fallback');
      setState({ lastError: replayError });
      return result;
    } catch {
      await appendOnce(event, 'caption-fallback');
      setState({ lastError: replayError });
      return { played: false, error: 'playback' };
    } finally {
      setState({ speakingPersonaId: null });
      await deps.resumeCapture();
    }
  };

  const speakIntro = async (intro: { personaId: string; voiceId: string; text: string }): Promise<AudioPlayResult> => {
    setState({ caption: intro.text, speakingPersonaId: intro.personaId, lastError: null });
    try {
      const audio = await deps.generateSpeech(intro.text, intro.voiceId);
      const result = await deps.playSpeech(audio);
      if (!result.played) setState({ lastError: replayError });
      return result;
    } catch {
      setState({ lastError: replayError });
      return { played: false, error: 'playback' };
    } finally {
      setState({ speakingPersonaId: null });
    }
  };

  return {
    speak,
    speakIntro,
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
