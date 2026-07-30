import { describe, expect, it, vi } from 'vitest';
import { createSimulationController } from './simulation-controller';
import { assemblePanel } from './personas';
import type { ExaminerEvent } from '@/features/defense/types';

const panel = assemblePanel();
const event: ExaminerEvent = { kind: 'question', text: 'What supports this result?', slideIndex: 1, evidence: 'Slide claim', occurredAtMs: 20 };
const segment = (text = 'one two three four five six seven eight') => ({ role: 'presenter' as const, slideIndex: 1, text, startedAtMs: 0, endedAtMs: 10 });

describe('simulation controller', () => {
  it('routes a qualifying diagnostic segment to the selected persona and speaks the tagged event', async () => {
    const speak = vi.fn();
    const requestTurn = vi.fn(async (_segment, persona) => ({ ...event, persona: { id: persona.id, title: persona.title } }));
    const controller = createSimulationController({ mode: 'diagnostic', panel, now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestTurn, speak, onComplete: vi.fn() });
    await controller.start();
    await controller.commit(segment('one two three')); // below the 8-word floor: ignored
    await controller.commit(segment());
    await controller.waitForExaminer();
    expect(requestTurn).toHaveBeenCalledOnce();
    // First turn goes to the first panel member.
    expect(requestTurn.mock.calls[0][1].id).toBe('professor');
    expect(speak).toHaveBeenCalledWith(expect.objectContaining({ persona: { id: 'professor', title: 'Professor' } }));
  });

  it('tags an untagged endpoint event with the persona the controller chose', async () => {
    const speak = vi.fn();
    const requestTurn = vi.fn().mockResolvedValue(event); // endpoint returned no persona
    const controller = createSimulationController({ mode: 'diagnostic', panel, now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestTurn, speak, onComplete: vi.fn() });
    await controller.start();
    await controller.commit(segment());
    await controller.waitForExaminer();
    expect(controller.getState().events[0].persona).toEqual({ id: 'professor', title: 'Professor' });
  });

  it('spreads consecutive diagnostic turns across the panel', async () => {
    const requestTurn = vi.fn(async (_segment, persona) => ({ ...event, persona: { id: persona.id, title: persona.title } }));
    const controller = createSimulationController({ mode: 'diagnostic', panel, now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestTurn, speak: vi.fn(), onComplete: vi.fn() });
    await controller.start();
    await controller.commit(segment()); await controller.waitForExaminer();
    await controller.commit({ ...segment(), endedAtMs: 11 }); await controller.waitForExaminer();
    expect(requestTurn.mock.calls.map((call) => call[1].id)).toEqual(['professor', 'examiner']);
  });

  it('awaits final capture persistence before completed and never regresses completed status', async () => {
    const writes: string[] = [];
    let controller!: ReturnType<typeof createSimulationController>;
    const persist = vi.fn(async (_s, _e, status: string) => { writes.push(status); });
    const stopCapture = vi.fn(async () => { await controller.commit(segment()); });
    controller = createSimulationController({ mode: 'mock', panel, now: () => 0, persist, startCapture: vi.fn(), stopCapture, requestTurn: vi.fn(), speak: vi.fn(), onComplete: vi.fn() });
    await controller.start(); await controller.end(); await controller.appendExaminer(event);
    expect(writes).toEqual(['practicing', 'practicing', 'completed', 'completed']);
  });

  it('keeps a mock room in Q&A until every queued question is answered, then finishes', async () => {
    const done = vi.fn();
    const controller = createSimulationController({ mode: 'mock', panel, now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestTurn: vi.fn(), speak: vi.fn(), onComplete: done });
    await controller.start(); await controller.appendExaminer(event); await controller.appendExaminer({ ...event, occurredAtMs: 21 }); await controller.end();
    controller.finish(); expect(done).not.toHaveBeenCalled();
    await controller.commit(segment('An answer long enough to be persisted first.'));
    await controller.continueQuestion();
    await controller.commit(segment('A second complete answer for the final question.'));
    await controller.continueQuestion(); controller.finish(); expect(done).toHaveBeenCalledOnce();
  });

  it('skips examiner requests and interruptions when mode is guided', async () => {
    const requestTurn = vi.fn();
    const controller = createSimulationController({ mode: 'guided', panel, now: () => 0, persist: vi.fn(), startCapture: vi.fn(), stopCapture: vi.fn(), requestTurn, speak: vi.fn(), onComplete: vi.fn() });
    await controller.start();
    await controller.commit(segment());
    await controller.waitForExaminer();
    expect(requestTurn).not.toHaveBeenCalled();
  });
});
