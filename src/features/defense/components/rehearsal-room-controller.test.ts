import { describe, expect, it, vi } from 'vitest';
import { createRehearsalRoomController } from './rehearsal-room-controller';
import type { ExaminerEvent } from '../types';

const event: ExaminerEvent = { kind: 'question', text: 'What supports this result?', slideIndex: 1, evidence: 'Slide claim', occurredAtMs: 20 };
const segment = (text = 'one two three four five six seven eight') => ({ role: 'presenter' as const, slideIndex: 1, text, startedAtMs: 0, endedAtMs: 10 });

describe('rehearsal room controller', () => {
  it('delivers only qualifying diagnostic presenter speech through the voice operation', async () => {
    const voice = vi.fn(); const requestExaminer = vi.fn().mockResolvedValue(event);
    const controller = createRehearsalRoomController({ mode: 'diagnostic', now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestExaminer, speak: voice, onComplete: vi.fn() });
    await controller.start();
    await controller.commit(segment('one two three'));
    await controller.commit(segment());
    await controller.waitForExaminer();
    expect(requestExaminer).toHaveBeenCalledOnce();
    expect(voice).toHaveBeenCalledWith(event);
  });

  it('keeps Mock Q&A active: captures and persists each answer before advancing and completing', async () => {
    const first = event; const second = { ...event, text: 'What is the limitation?', occurredAtMs: 30 };
    const voice = vi.fn(); const done = vi.fn();
    const controller = createRehearsalRoomController({ mode: 'mock', now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestExaminer: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second), speak: voice, onComplete: done });
    await controller.start(); await controller.commit(segment()); await controller.commit({ ...segment(), endedAtMs: 11 }); await controller.waitForExaminer();
    expect(voice).not.toHaveBeenCalled();
    await controller.end();
    expect(voice).toHaveBeenLastCalledWith(first); expect(done).not.toHaveBeenCalled();
    expect(controller.getState().ended).toBe(false);
    await controller.commit({ ...segment('My answer explains the supporting evidence clearly.'), endedAtMs: 12 });
    expect(controller.getState().answerCommitted).toBe(true);
    await controller.continueQuestion();
    expect(voice).toHaveBeenLastCalledWith(second); expect(done).not.toHaveBeenCalled();
    await controller.commit({ ...segment('My final answer addresses the limitation with data.'), endedAtMs: 13 });
    await controller.continueQuestion();
    controller.finish(); expect(done).toHaveBeenCalledOnce();
  });

  it('flushes the active slide before navigation and restarts capture with the new slide timing', async () => {
    let now = 10; const order: string[] = []; const startCapture = vi.fn(() => { order.push('start'); }); const stopCapture = vi.fn(async () => { order.push('stop'); });
    const controller = createRehearsalRoomController({ mode: 'mock', now: () => now, persist: vi.fn(), startCapture, stopCapture, requestExaminer: vi.fn(), speak: vi.fn(), onComplete: vi.fn() });
    await controller.start(); now = 30; await controller.changeSlide(2);
    expect(order).toEqual(['start', 'stop', 'start']);
    expect(startCapture).toHaveBeenLastCalledWith(expect.objectContaining({ slideIndex: 2, startedAtMs: 20 }));
  });

  it('awaits final capture persistence before completed and never regresses completed status', async () => {
    const writes: string[] = []; let controller!: ReturnType<typeof createRehearsalRoomController>;
    const persist = vi.fn(async (_segments, _events, status: string) => { writes.push(status); });
    const stopCapture = vi.fn(async () => { await controller.commit(segment()); });
    controller = createRehearsalRoomController({ mode: 'mock', now: () => 0, persist, startCapture: vi.fn(), stopCapture, requestExaminer: vi.fn(), speak: vi.fn(), onComplete: vi.fn() });
    await controller.start(); await controller.end(); await controller.appendExaminer(event);
    expect(writes).toEqual(['practicing', 'practicing', 'completed', 'completed']);
  });

  it('does not deadlock when diagnostic delivery pauses capture after a committed segment', async () => {
    const stopCapture = vi.fn(async () => undefined);
    const speak = vi.fn(async () => { await stopCapture(); });
    const controller = createRehearsalRoomController({ mode: 'diagnostic', now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture, requestExaminer: vi.fn().mockResolvedValue(event), speak, onComplete: vi.fn() });
    await controller.start();
    await controller.commit(segment());
    await controller.waitForExaminer();
    expect(speak).toHaveBeenCalledWith(event);
    expect(stopCapture).toHaveBeenCalledOnce();
  });

  it('does not finish a mock room until every queued question has a captured answer', async () => {
    const done = vi.fn(); const controller = createRehearsalRoomController({ mode: 'mock', now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestExaminer: vi.fn(), speak: vi.fn(), onComplete: done });
    await controller.start(); await controller.appendExaminer(event); await controller.appendExaminer({ ...event, occurredAtMs: 21 }); await controller.end();
    controller.finish(); expect(done).not.toHaveBeenCalled();
    await controller.commit(segment('An answer long enough to be persisted first.'));
    await controller.continueQuestion();
    await controller.commit(segment('A second complete answer for the final question.'));
    await controller.continueQuestion(); controller.finish(); expect(done).toHaveBeenCalledOnce();
  });

  it('keeps a late mock decision from the final capture, speaks it, and gates finish', async () => {
    let resolveExaminer!: (event: ExaminerEvent | null) => void;
    const examiner = new Promise<ExaminerEvent | null>((resolve) => { resolveExaminer = resolve; });
    let controller!: ReturnType<typeof createRehearsalRoomController>;
    const speak = vi.fn();
    const stopCapture = vi.fn(async () => { await controller.commit(segment()); });
    controller = createRehearsalRoomController({ mode: 'mock', now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture, requestExaminer: vi.fn().mockReturnValue(examiner), speak, onComplete: vi.fn() });
    await controller.start();
    const ending = controller.end();
    resolveExaminer(event);
    await ending;
    expect(controller.getState().events).toEqual([event]);
    expect(speak).toHaveBeenCalledWith(event);
    expect(controller.canFinish()).toBe(false);
  });

  it('preserves persisted evidence when new presenter and examiner updates are saved', async () => {
    const originalSegment = { ...segment('already saved speech'), endedAtMs: 2 };
    const originalEvent = { ...event, occurredAtMs: 2 };
    const persist = vi.fn();
    const controller = createRehearsalRoomController({ mode: 'mock', now: () => 0, persist, startCapture: vi.fn(), stopCapture: vi.fn(), requestExaminer: vi.fn(), speak: vi.fn(), onComplete: vi.fn(), initialSegments: [originalSegment], initialEvents: [originalEvent] });
    await controller.start(); await controller.commit(segment('new presenter speech'));
    expect(persist).toHaveBeenLastCalledWith([originalSegment, expect.objectContaining({ text: 'new presenter speech' })], [originalEvent], 'practicing');
  });
});
