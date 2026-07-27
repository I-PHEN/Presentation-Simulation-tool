import type { DefenseMode, ExaminerEvent, TranscriptSegment } from '@/features/defense/types';
import type { Persona } from './personas';
import { selectNextSpeaker } from './turn-selection';

export type SimulationControllerDependencies = {
  mode: DefenseMode;
  panel: Persona[];
  now: () => number;
  persist: (segments: TranscriptSegment[], events: ExaminerEvent[], status: 'practicing' | 'completed') => Promise<void> | void;
  startCapture: (start: { slideIndex: number; startedAtMs: number }) => Promise<void> | void;
  stopCapture: () => Promise<void> | void;
  requestTurn: (segment: TranscriptSegment, persona: Persona) => Promise<ExaminerEvent | null>;
  speak: (event: ExaminerEvent) => Promise<unknown> | unknown;
  onComplete: () => void;
  onChange?: () => void;
  selectSpeaker?: (panel: Persona[], events: ReadonlyArray<{ persona?: { id: string } }>) => Persona;
  initialSlideIndex?: number;
  initialSegments?: TranscriptSegment[];
  initialEvents?: ExaminerEvent[];
};

const minimumWords = 8;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function createSimulationController(dependencies: SimulationControllerDependencies) {
  const pickSpeaker = dependencies.selectSpeaker ?? selectNextSpeaker;
  let slideIndex = dependencies.initialSlideIndex ?? 1;
  let startedAtMs = 0;
  let started = false;
  let ended = false;
  let status: 'practicing' | 'completed' = 'practicing';
  let segments: TranscriptSegment[] = dependencies.initialSegments ?? [];
  let events: ExaminerEvent[] = dependencies.initialEvents ?? [];
  let queueIndex = 0;
  let answeringQuestion = false;
  let answerCommitted = false;
  let persistence = Promise.resolve();
  let examinerWork = Promise.resolve();
  const notify = () => dependencies.onChange?.();

  const save = (nextStatus = status) => {
    persistence = persistence.then(() => dependencies.persist(segments, events, nextStatus));
    return persistence;
  };
  const captureStart = () => dependencies.startCapture({ slideIndex, startedAtMs: Math.max(0, dependencies.now() - startedAtMs) });

  const appendExaminer = async (event: ExaminerEvent) => {
    events = [...events, event];
    notify();
    await save();
  };
  const appendExaminerSegment = async (segment: TranscriptSegment) => {
    segments = [...segments, segment];
    notify();
    await save();
  };
  const examine = async (segment: TranscriptSegment) => {
    if (words(segment.text) < minimumWords) return;
    const persona = pickSpeaker(dependencies.panel, events);
    const raw = await dependencies.requestTurn(segment, persona);
    if (!raw) return;
    const event: ExaminerEvent = raw.persona ? raw : { ...raw, persona: { id: persona.id, title: persona.title } };
    await appendExaminer(event);
    if (dependencies.mode === 'diagnostic') await dependencies.speak(event);
  };
  const commit = async (segment: TranscriptSegment) => {
    if (ended || !segment.text.trim()) return;
    segments = [...segments, segment];
    notify();
    await save();
    if (dependencies.mode === 'uninterrupted') {
      return;
    }
    if (dependencies.mode === 'mock' && answeringQuestion) {
      answerCommitted = true;
      notify();
      return;
    }
    // Deliberately detached: stopCapture only waits for the final presenter
    // persistence, never for examiner speech that may pause capture itself.
    examinerWork = examinerWork.then(() => examine(segment));
  };
  const start = async () => {
    startedAtMs = dependencies.now();
    started = true;
    status = 'practicing';
    await save('practicing');
    await captureStart();
    notify();
  };
  const changeSlide = async (nextSlideIndex: number) => {
    if (started && !ended) await dependencies.stopCapture();
    slideIndex = nextSlideIndex;
    notify();
    if (started && !ended) await captureStart();
  };
  const end = async () => {
    if (ended) return;
    // stopCapture is required to resolve only after its final commit has run.
    await dependencies.stopCapture();
    // Capture stop only awaited presenter persistence. It is safe to await
    // independently tracked examiner decisions here because capture is detached.
    await examinerWork;
    if ((dependencies.mode === 'mock' || dependencies.mode === 'uninterrupted') && events.length) {
      answeringQuestion = true;
      answerCommitted = false;
      slideIndex = events[queueIndex].slideIndex;
      await dependencies.speak(events[queueIndex]);
    } else {
      ended = true;
      status = 'completed';
      await save('completed');
    }
    notify();
  };
  const continueQuestion = async () => {
    if (!answeringQuestion || dependencies.mode !== 'mock' || !answerCommitted) return;
    await dependencies.stopCapture();
    const next = queueIndex + 1;
    if (next >= events.length) {
      answeringQuestion = false;
      ended = true;
      status = 'completed';
      await save('completed');
      notify();
      return;
    }
    queueIndex = next;
    answerCommitted = false;
    slideIndex = events[queueIndex].slideIndex;
    notify();
    await dependencies.speak(events[queueIndex]);
  };
  const canFinish = () => ended;
  const finish = () => { if (canFinish()) dependencies.onComplete(); };

  return { start, commit, appendExaminer, appendExaminerSegment, changeSlide, end, continueQuestion, finish, waitForExaminer: () => examinerWork, canFinish, getState: () => ({ slideIndex, started, ended, status, segments, events, queueIndex, answeringQuestion, answerCommitted, panel: dependencies.panel }) };
}
