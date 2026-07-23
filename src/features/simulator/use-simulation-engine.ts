'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSTT, generateTTS, playAudioData, unlockAudio } from '@/lib/voice-engine';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';
import { analyseReading } from '@/features/defense/reading-analysis';
import { spokenBySlide } from '@/features/defense/transcript';
import { createSimulationController } from './simulation-controller';
import { createPanelVoiceController } from './panel-voice';
import { assemblePanel, type Persona } from './personas';
import { computeMetrics } from './metrics';
import { buildIntroRequest, parseIntroResponse } from './intro';
import { createSessionRecorder } from './session-recorder';
import { acquireBrowserRecorder } from './browser-audio-recorder';
import { uploadSessionAudio } from './upload-recording';

type SimSession = { id: string; deck: DeckContext; mode: DefenseMode; stance: ExaminerStance; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; status: string };
type STTHandle = Awaited<ReturnType<typeof createSTT>>;
export type SimulationPhase = 'ready' | 'introducing' | 'live' | 'ended';

export function useSimulationEngine(session: SimSession, { onComplete }: { onComplete: () => void }) {
  const [, render] = useState(0);
  const rerender = useCallback(() => render((v) => v + 1), []);
  const [phase, setPhase] = useState<SimulationPhase>('ready');
  const [interim, setInterim] = useState('');
  const [captureState, setCaptureState] = useState<'idle' | 'listening' | 'paused'>('idle');
  const [error, setError] = useState<string | null>(null);

  const panel = useMemo<Persona[]>(() => assemblePanel(), []);
  const voiceForPersona = useCallback((id: string) => panel.find((p) => p.id === id)?.voiceId ?? panel[0].voiceId, [panel]);

  const captureRef = useRef<STTHandle | null>(null);
  const pendingCommitRef = useRef<Promise<unknown>>(Promise.resolve());
  const startedAtRef = useRef(0);
  const controllerRef = useRef<ReturnType<typeof createSimulationController> | null>(null);
  const voiceRef = useRef<ReturnType<typeof createPanelVoiceController> | null>(null);
  const recorderRef = useRef<ReturnType<typeof createSessionRecorder> | null>(null);
  if (!recorderRef.current) {
    recorderRef.current = createSessionRecorder({
      acquire: acquireBrowserRecorder,
      upload: (blob) => uploadSessionAudio(session.id, blob),
      onError: (message) => setError(message),
    });
  }
  const recorder = recorderRef.current;
  useEffect(() => () => { void recorder.stop(); }, [recorder]);

  const stopCapture = useCallback(async () => {
    const capture = captureRef.current; captureRef.current = null;
    if (capture) await capture.stop();
    await pendingCommitRef.current;
    setInterim('');
  }, []);

  const startCapture = useCallback(async (start: { slideIndex: number; startedAtMs: number }) => {
    setError(null);
    try {
      const controller = controllerRef.current; if (!controller) return;
      captureRef.current = await createSTT(setInterim, (text) => {
        const segment: TranscriptSegment = { role: 'presenter', slideIndex: start.slideIndex, text: text.trim(), startedAtMs: start.startedAtMs, endedAtMs: Math.max(start.startedAtMs, Date.now() - startedAtRef.current) };
        pendingCommitRef.current = controller.commit(segment);
      });
      captureRef.current.start();
      setCaptureState('listening');
    } catch {
      setCaptureState('idle');
      setError('Microphone access was unavailable. Check permission and retry.');
    }
  }, []);

  const pauseCapture = useCallback(async () => { setCaptureState('paused'); await stopCapture(); }, [stopCapture]);
  const resumeCapture = useCallback(async () => {
    const controller = controllerRef.current; if (!controller) return;
    const state = controller.getState();
    if (state.started && !state.ended) await startCapture({ slideIndex: state.slideIndex, startedAtMs: Math.max(0, Date.now() - startedAtRef.current) });
  }, [startCapture]);

  if (!voiceRef.current) {
    voiceRef.current = createPanelVoiceController({
      pauseCapture, resumeCapture, generateSpeech: generateTTS, playSpeech: playAudioData,
      appendSegment: async (segment) => { await controllerRef.current?.appendExaminerSegment(segment); },
      defaultVoiceId: panel[0].voiceId, voiceForPersona, now: () => Math.max(0, Date.now() - startedAtRef.current),
    });
    voiceRef.current.subscribe(rerender);
  }
  const voice = voiceRef.current;

  if (!controllerRef.current) {
    controllerRef.current = createSimulationController({
      mode: session.mode, panel, now: () => Date.now(),
      initialSlideIndex: session.deck.slides[0].index, initialSegments: session.transcriptSegments, initialEvents: session.examinerEvents,
      persist: async (segments, events, status) => {
        const response = await authenticatedFetch(`/api/session/${session.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcriptSegments: segments, examinerEvents: events, status }) });
        if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(typeof body.error === 'string' ? body.error : 'Your rehearsal could not be saved. Retry before finishing.'); }
      },
      startCapture, stopCapture,
      requestTurn: async (segment, persona) => {
        const state = controllerRef.current!.getState();
        const evidence = analyseReading(session.deck.slides, spokenBySlide(state.segments)).find((item) => item.slideIndex === segment.slideIndex);
        const response = await authenticatedFetch('/api/defense/examiner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.id, currentSegment: segment, readingEvidence: evidence, persona: { id: persona.id, title: persona.title, promptFragment: persona.promptFragment } }) });
        const body = await response.json().catch(() => ({}));
        return response.ok && body.event ? body.event as ExaminerEvent : null;
      },
      speak: voice.speak, onComplete, onChange: rerender,
    });
  }
  const controller = controllerRef.current;
  const state = controller.getState();
  const voiceState = voice.getState();

  const position = Math.max(0, session.deck.slides.findIndex((s) => s.index === state.slideIndex));
  const slide = session.deck.slides[position];
  const metrics = useMemo(() => computeMetrics(state.segments), [state.segments]);

  const begin = useCallback(async () => {
    unlockAudio();
    startedAtRef.current = Date.now();
    await recorder.start();
    setPhase('introducing');
    try {
      const res = await authenticatedFetch('/api/intro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildIntroRequest(session.deck.sourceName, panel)) });
      const intro = parseIntroResponse(await res.json().catch(() => null), panel);
      await voice.speakIntro(intro);
    } catch { /* intro is best-effort; never blocks the rehearsal */ }
    setPhase('live');
    await controller.start();
  }, [controller, panel, recorder, session.deck.sourceName, voice]);

  const replayIntro = useCallback(async () => {
    const res = await authenticatedFetch('/api/intro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildIntroRequest(session.deck.sourceName, panel)) }).catch(() => null);
    const intro = parseIntroResponse(res ? await res.json().catch(() => null) : null, panel);
    await voice.speakIntro(intro);
  }, [panel, session.deck.sourceName, voice]);

  const toggleMic = useCallback(async () => {
    if (captureState === 'listening') { setCaptureState('paused'); await stopCapture(); }
    else { await startCapture({ slideIndex: state.slideIndex, startedAtMs: Math.max(0, Date.now() - startedAtRef.current) }); }
  }, [captureState, startCapture, state.slideIndex, stopCapture]);

  const changeSlide = useCallback(async (pos: number) => { await controller.changeSlide(session.deck.slides[pos].index); }, [controller, session.deck.slides]);
  const end = useCallback(async () => {
    let failure: string | null = null;
    try {
      await controller.end();
    } catch (e) {
      failure = e instanceof Error ? e.message : 'Your rehearsal could not be saved.';
    }
    await recorder.stop(); // finish upload + release BEFORE showing the report, so audio is present on first load
    if (failure) setError(failure);
    setCaptureState('idle');
    setPhase(controller.getState().ended ? 'ended' : 'live');
  }, [controller, recorder]);

  return {
    phase, slide, position, total: session.deck.slides.length, captureState, micActive: captureState === 'listening', recording: recorder.isRecording(),
    panel, speakingPersonaId: voiceState.speakingPersonaId, caption: voiceState.caption, events: state.events, transcript: state.segments, interim, metrics,
    error: error ?? voiceState.lastError, begin, toggleMic, changeSlide, end, replayIntro,
    canFinish: controller.canFinish(), finish: controller.finish,
  };
}
