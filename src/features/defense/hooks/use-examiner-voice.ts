'use client';

import { useRef, useSyncExternalStore } from 'react';
import type { ExaminerEvent, TranscriptSegment } from '../types';
import type { AudioPlayResult } from '@/lib/voice-engine';

export interface ExaminerVoiceState {
  caption: string | null;
  lastEvent: ExaminerEvent | null;
  lastError: string | null;
}

export interface ExaminerVoiceDependencies {
  pauseCapture: () => void | Promise<void>;
  resumeCapture: () => void | Promise<void>;
  generateSpeech: (text: string) => Promise<unknown>;
  playSpeech: (audio: unknown) => Promise<AudioPlayResult>;
  appendSegment: (segment: ExaminerTranscriptSegment) => void | Promise<void>;
  now?: () => number;
}

export type ExaminerTranscriptSegment = TranscriptSegment & { delivery: 'audio' | 'caption-fallback' };

const replayError = 'Audio could not play. Use replay to try again.';

export function createExaminerVoiceController(dependencies: ExaminerVoiceDependencies) {
  let state: ExaminerVoiceState = { caption: null, lastEvent: null, lastError: null };
  const attemptedEventKeys = new Set<string>();
  const failedAppendKeys = new Set<string>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  const setState = (next: Partial<ExaminerVoiceState>) => { state = { ...state, ...next }; emit(); };
  const eventKey = (event: ExaminerEvent) => [event.kind, event.slideIndex, event.occurredAtMs, event.text, event.evidence].join('|');
  const appendOnce = async (event: ExaminerEvent, delivery: ExaminerTranscriptSegment['delivery']): Promise<boolean> => {
    const key = eventKey(event);
    if (attemptedEventKeys.has(key)) return !failedAppendKeys.has(key);
    attemptedEventKeys.add(key);
    try {
      await dependencies.appendSegment({
        role: 'examiner', slideIndex: event.slideIndex, text: event.text,
        startedAtMs: event.occurredAtMs, endedAtMs: dependencies.now?.() ?? event.occurredAtMs,
        delivery,
      });
      return true;
    } catch {
      failedAppendKeys.add(key);
      return false;
    }
  };

  const speak = async (event: ExaminerEvent): Promise<AudioPlayResult> => {
    await dependencies.pauseCapture();
    setState({ caption: event.text, lastEvent: event, lastError: null });
    try {
      const audio = await dependencies.generateSpeech(event.text);
      const result = await dependencies.playSpeech(audio);
      if (result.played) {
        if (!await appendOnce(event, 'audio')) {
          setState({ lastError: replayError });
          return { played: false, error: 'playback' };
        }
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
      await dependencies.resumeCapture();
    }
  };

  return {
    speak,
    replayLast: async () => state.lastEvent ? speak(state.lastEvent) : { played: false, error: 'playback' } as AudioPlayResult,
    getState: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

export function useExaminerVoice(dependencies: ExaminerVoiceDependencies) {
  const controllerRef = useRef<ReturnType<typeof createExaminerVoiceController> | null>(null);
  if (!controllerRef.current) controllerRef.current = createExaminerVoiceController(dependencies);
  const controller = controllerRef.current;
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  return { ...controller, state, lastCaption: state.caption, lastEvent: state.lastEvent, lastError: state.lastError };
}
