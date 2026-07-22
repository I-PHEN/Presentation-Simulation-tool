import { describe, expect, it, vi } from 'vitest';
import { createPanelVoiceController } from './panel-voice';
import type { ExaminerEvent } from '@/features/defense/types';

const VOICE = 'voice-professor';
const event: ExaminerEvent = { kind: 'question', text: 'What supports this?', slideIndex: 1, evidence: 'x', occurredAtMs: 10, persona: { id: 'professor', title: 'Professor' } };

function deps(overrides = {}) {
  return {
    pauseCapture: vi.fn(), resumeCapture: vi.fn(),
    generateSpeech: vi.fn(async () => ({ audio: new Blob() })),
    playSpeech: vi.fn(async () => ({ played: true as const })),
    appendSegment: vi.fn(),
    defaultVoiceId: 'voice-default',
    now: () => 42,
    voiceForPersona: (id: string) => (id === 'professor' ? VOICE : 'voice-default'),
    ...overrides,
  };
}

describe('createPanelVoiceController', () => {
  it('speaks an examiner event in its persona voice, pausing then resuming capture', async () => {
    const d = deps();
    const c = createPanelVoiceController(d);
    await c.speak(event);
    expect(d.pauseCapture).toHaveBeenCalledOnce();
    expect(d.generateSpeech).toHaveBeenCalledWith(event.text, VOICE);
    expect(d.resumeCapture).toHaveBeenCalledOnce();
    expect(c.getState().caption).toBe(event.text);
    expect(c.getState().speakingPersonaId).toBe(null); // cleared after speaking
  });

  it('falls back to the default voice when the event has no persona', async () => {
    const d = deps();
    const c = createPanelVoiceController(d);
    await c.speak({ ...event, persona: undefined });
    expect(d.generateSpeech).toHaveBeenCalledWith(event.text, 'voice-default');
  });

  it('plays the opening intro without appending a transcript segment', async () => {
    const d = deps();
    const c = createPanelVoiceController(d);
    await c.speakIntro({ personaId: 'professor', voiceId: VOICE, text: 'Welcome. Turn on your mic when ready.' });
    expect(d.generateSpeech).toHaveBeenCalledWith('Welcome. Turn on your mic when ready.', VOICE);
    expect(d.playSpeech).toHaveBeenCalledOnce();
    expect(d.appendSegment).not.toHaveBeenCalled(); // intro is greeting, not evidence
    expect(d.pauseCapture).not.toHaveBeenCalled(); // capture not started yet at intro time
  });

  it('surfaces a replayable error and caption when playback fails', async () => {
    const d = deps({ playSpeech: vi.fn(async () => ({ played: false as const, error: 'autoplay' as const })) });
    const c = createPanelVoiceController(d);
    await c.speak(event);
    expect(c.getState().lastError).toBeTruthy();
    expect(c.getState().caption).toBe(event.text);
  });
});
