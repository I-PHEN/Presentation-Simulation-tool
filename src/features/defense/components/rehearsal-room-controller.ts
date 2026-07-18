import type { DefenseMode, ExaminerEvent, TranscriptSegment } from '../types';

export type CaptureStart = { slideIndex: number; startedAtMs: number };

export type RehearsalRoomControllerDependencies = {
  mode: DefenseMode;
  now: () => number;
  persist: (segments: TranscriptSegment[], events: ExaminerEvent[], status: 'practicing' | 'completed') => Promise<void> | void;
  startCapture: (start: CaptureStart) => Promise<void> | void;
  stopCapture: () => Promise<void> | void;
  requestExaminer: (segment: TranscriptSegment) => Promise<ExaminerEvent | null>;
  speak: (event: ExaminerEvent) => Promise<unknown> | unknown;
  onComplete: () => void;
  onChange?: () => void;
  initialSlideIndex?: number;
  initialSegments?: TranscriptSegment[];
  initialEvents?: ExaminerEvent[];
};

const minimumWords = 8;
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export function createRehearsalRoomController(dependencies: RehearsalRoomControllerDependencies) {
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
    const event = await dependencies.requestExaminer(segment);
    if (!event) return;
    await appendExaminer(event);
    if (dependencies.mode === 'diagnostic') await dependencies.speak(event);
  };
  const commit = async (segment: TranscriptSegment) => {
    if (ended || !segment.text.trim()) return;
    segments = [...segments, segment];
    notify();
    await save();
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
    if (dependencies.mode === 'mock' && events.length) {
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

  return { start, commit, appendExaminer, appendExaminerSegment, changeSlide, end, continueQuestion, finish, waitForExaminer: () => examinerWork, canFinish, getState: () => ({ slideIndex, started, ended, status, segments, events, queueIndex, answeringQuestion, answerCommitted }) };
}
