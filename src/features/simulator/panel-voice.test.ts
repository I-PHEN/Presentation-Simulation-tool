import { describe, expect, it, vi } from 'vitest';
import { createPanelVoiceController } from './panel-voice';
import type { ExaminerEvent } from '@/features/defense/types';
import type { AudioPlayResult } from '@/lib/voice-engine';

const VOICE = 'voice-professor';
const event: ExaminerEvent = { kind: 'question', text: 'What supports this?', slideIndex: 1, evidence: 'x', occurredAtMs: 10, persona: { id: 'professor', title: 'Professor' } };
const LONG = 'Walk me through the method you used for this study';
const longEvent: ExaminerEvent = { ...event, text: LONG };

/** Manual clock so reveal pacing is asserted deterministically, no real timers. */
function fakeClock() {
  let seq = 0;
  let now = 0;
  const tasks = new Map<number, { fn: () => void; at: number }>();
  return {
    setTimer: (fn: () => void, ms: number) => { const id = ++seq; tasks.set(id, { fn, at: now + ms }); return id; },
    clearTimer: (handle: unknown) => { tasks.delete(handle as number); },
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const due = [...tasks.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        tasks.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = target;
    },
  };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

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

  it('reveals the caption word by word rather than all at once', async () => {
    const clock = fakeClock();
    let release!: (result: AudioPlayResult) => void;
    const d = deps({
      setTimer: clock.setTimer, clearTimer: clock.clearTimer,
      playSpeech: vi.fn(() => new Promise<AudioPlayResult>((resolve) => { release = resolve; })),
    });
    const c = createPanelVoiceController(d);

    const speaking = c.speak(longEvent);
    await flush();
    expect(c.getState().caption).toBe('Walk'); // not the whole line
    expect(c.getState().captionFull).toBe(LONG);
    expect(c.getState().captionDone).toBe(false);
    expect(c.getState().captionPersonaId).toBe('professor');

    clock.advance(325);
    expect(c.getState().caption).toBe('Walk me');
    clock.advance(325 * 3);
    expect(c.getState().caption).toBe('Walk me through the method');

    release({ played: true });
    await speaking;
  });

  it('paces the remaining words to the clip length the player reports', async () => {
    const clock = fakeClock();
    let release!: (result: AudioPlayResult) => void;
    const d = deps({
      setTimer: clock.setTimer, clearTimer: clock.clearTimer,
      // 10 words over 5s => 500ms per word, far slower than the 325ms estimate.
      playSpeech: vi.fn((_audio: unknown, onDuration?: (ms: number) => void) => {
        onDuration?.(5000);
        return new Promise<AudioPlayResult>((resolve) => { release = resolve; });
      }),
    });
    const c = createPanelVoiceController(d);

    const speaking = c.speak(longEvent);
    await flush();
    clock.advance(1000);
    expect(c.getState().caption).toBe('Walk me through');

    release({ played: true });
    await speaking;
  });

  it('snaps the caption to the full line once speaking is over', async () => {
    const clock = fakeClock();
    const d = deps({ setTimer: clock.setTimer, clearTimer: clock.clearTimer });
    const c = createPanelVoiceController(d);
    await c.speak(longEvent);
    expect(c.getState().caption).toBe(LONG);
    expect(c.getState().captionDone).toBe(true);
    clock.advance(10_000); // no reveal timers left running
    expect(c.getState().caption).toBe(LONG);
  });

  it('streams the intro caption too, keeping its speaker attribution', async () => {
    const clock = fakeClock();
    let release!: (result: AudioPlayResult) => void;
    const d = deps({
      setTimer: clock.setTimer, clearTimer: clock.clearTimer,
      playSpeech: vi.fn(() => new Promise<AudioPlayResult>((resolve) => { release = resolve; })),
    });
    const c = createPanelVoiceController(d);

    const speaking = c.speakIntro({ personaId: 'professor', voiceId: VOICE, text: 'Welcome to your defense' });
    await flush();
    expect(c.getState().caption).toBe('Welcome');
    expect(c.getState().captionPersonaId).toBe('professor');

    release({ played: true });
    await speaking;
    expect(c.getState().caption).toBe('Welcome to your defense');
    expect(c.getState().speakingPersonaId).toBe(null);
    expect(c.getState().captionPersonaId).toBe('professor'); // attribution survives
  });

  it('surfaces a replayable error and caption when playback fails', async () => {
    const d = deps({ playSpeech: vi.fn(async () => ({ played: false as const, error: 'autoplay' as const })) });
    const c = createPanelVoiceController(d);
    await c.speak(event);
    expect(c.getState().lastError).toBeTruthy();
    expect(c.getState().caption).toBe(event.text);
  });
});
