import { afterEach, describe, expect, it, vi } from 'vitest';
const { authenticatedFetch } = vi.hoisted(() => ({ authenticatedFetch: vi.fn() }));
vi.mock('./authenticated-fetch', () => ({ authenticatedFetch }));
import { generateTTS, playAudioData } from './voice-engine';

describe('playAudioData', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reports autoplay rejection rather than success', async () => {
    const autoplayError = Object.assign(new Error('NotAllowedError'), { name: 'NotAllowedError' });
    const audio = { play: vi.fn().mockRejectedValue(autoplayError), volume: 0 };
    vi.stubGlobal('Audio', function Audio() { return audio; });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:audio'), revokeObjectURL: vi.fn() });

    await expect(playAudioData({ audio: new Blob() })).resolves.toEqual({ played: false, error: 'autoplay' });
  });

  it('reports generic playback errors and clears the object URL', async () => {
    const audio = { play: vi.fn().mockResolvedValue(undefined), volume: 0, onerror: null as null | (() => void) };
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('Audio', function Audio() { return audio; });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:audio'), revokeObjectURL });
    const result = playAudioData({ audio: new Blob() });
    audio.onerror?.();

    await expect(result).resolves.toEqual({ played: false, error: 'playback' });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:audio');
  });

  it('classifies non-autoplay play rejections as playback failures', async () => {
    const audio = { play: vi.fn().mockRejectedValue(new Error('decode failed')), volume: 0 };
    vi.stubGlobal('Audio', function Audio() { return audio; });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:audio'), revokeObjectURL: vi.fn() });
    await expect(playAudioData({ audio: new Blob() })).resolves.toEqual({ played: false, error: 'playback' });
  });

  it('stops active playback, revokes its URL, and settles the play call', async () => {
    const audio = { play: vi.fn(() => new Promise<void>(() => {})), pause: vi.fn(), src: 'blob:audio', volume: 0 };
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('Audio', function Audio() { return audio; });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:audio'), revokeObjectURL });
    const result = playAudioData({ audio: new Blob() });
    const { stopAudioPlayback } = await import('./voice-engine');
    stopAudioPlayback();
    await expect(result).resolves.toEqual({ played: false, error: 'playback' });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:audio');
  });

  it('settles and releases existing playback before replacing it with a new audio request', async () => {
    const audios: Array<{ play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; src: string; volume: number }> = [];
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('Audio', function Audio() { const audio = { play: vi.fn(() => new Promise<void>(() => {})), pause: vi.fn(), src: '', volume: 0 }; audios.push(audio); return audio; });
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second'), revokeObjectURL });
    const first = playAudioData({ audio: new Blob() });
    const second = playAudioData({ audio: new Blob() });
    await expect(first).resolves.toEqual({ played: false, error: 'playback' });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:first');
    const { stopAudioPlayback } = await import('./voice-engine');
    stopAudioPlayback();
    await expect(second).resolves.toEqual({ played: false, error: 'playback' });
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:second');
  });
});

describe('generateTTS', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses authenticated transport for the protected TTS endpoint', async () => {
    authenticatedFetch.mockResolvedValue(new Response(new Blob(['audio'])));
    await expect(generateTTS('Question', 'voice-1')).resolves.toEqual({ audio: expect.any(Blob) });
    expect(authenticatedFetch).toHaveBeenCalledWith('/api/tts', expect.objectContaining({ method: 'POST' }));
  });
});
