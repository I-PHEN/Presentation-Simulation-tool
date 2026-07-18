import { describe, expect, it, vi } from 'vitest';
import { createExaminerVoiceController } from './use-examiner-voice';
import type { ExaminerEvent } from '../types';

const event: ExaminerEvent = {
  kind: 'question', text: 'How does this support your conclusion?', slideIndex: 1,
  evidence: 'The presenter said conclusion without explaining the claim.', occurredAtMs: 100,
};

describe('createExaminerVoiceController', () => {
  it('pauses, plays, appends, then resumes on successful speech', async () => {
    const order: string[] = [];
    const controller = createExaminerVoiceController({
      pauseCapture: () => { order.push('pause'); },
      resumeCapture: () => { order.push('resume'); },
      generateSpeech: async () => ({ audio: new Blob() }),
      playSpeech: async () => { order.push('play'); return { played: true }; },
      appendSegment: () => { order.push('append'); },
    });

    await expect(controller.speak(event)).resolves.toEqual({ played: true });
    expect(order).toEqual(['pause', 'play', 'append', 'resume']);
    expect(controller.getState().caption).toBe(event.text);
  });

  it('keeps a caption fallback, appends once, and replays without duplication after playback fails', async () => {
    const appendSegment = vi.fn();
    const resumeCapture = vi.fn();
    const controller = createExaminerVoiceController({
      pauseCapture: vi.fn(), resumeCapture,
      generateSpeech: async () => ({ audio: new Blob() }),
      playSpeech: async () => ({ played: false, error: 'autoplay' }),
      appendSegment,
    });

    await expect(controller.speak(event)).resolves.toEqual({ played: false, error: 'autoplay' });
    expect(controller.getState()).toMatchObject({ caption: event.text, lastError: 'Audio could not play. Use replay to try again.' });
    expect(appendSegment).toHaveBeenCalledTimes(1);
    expect(appendSegment).toHaveBeenCalledWith(expect.objectContaining({ role: 'examiner', text: event.text }));
    expect(resumeCapture).toHaveBeenCalledTimes(1);

    await expect(controller.replayLast()).resolves.toEqual({ played: false, error: 'autoplay' });
    expect(appendSegment).toHaveBeenCalledTimes(1);
    expect(resumeCapture).toHaveBeenCalledTimes(2);
  });

  it('keeps the caption and does not retry an append that failed for the same event key', async () => {
    const appendSegment = vi.fn().mockRejectedValue(new Error('storage unavailable'));
    const controller = createExaminerVoiceController({ pauseCapture: vi.fn(), resumeCapture: vi.fn(), generateSpeech: async () => ({ audio: new Blob() }), playSpeech: async () => ({ played: true }), appendSegment });
    await expect(controller.speak(event)).resolves.toEqual({ played: false, error: 'playback' });
    await controller.replayLast();
    expect(controller.getState().caption).toBe(event.text);
    expect(controller.getState().lastError).toBe('Audio could not play. Use replay to try again.');
    expect(appendSegment).toHaveBeenCalledTimes(1);
  });
});
