import { describe, expect, it, vi } from 'vitest';
import { createSessionRecorder, type RecorderSink } from './session-recorder';

function sink(blob = new Blob(['audio'], { type: 'audio/webm' })): RecorderSink & { started: number; released: number } {
  const s = {
    started: 0, released: 0,
    start: vi.fn(() => { s.started += 1; }),
    stop: vi.fn(async () => blob),
    release: vi.fn(() => { s.released += 1; }),
  };
  return s as unknown as RecorderSink & { started: number; released: number };
}

describe('createSessionRecorder', () => {
  it('acquires and starts a single recording', async () => {
    const s = sink();
    const acquire = vi.fn(async () => s);
    const r = createSessionRecorder({ acquire, upload: vi.fn(async () => undefined) });
    await r.start();
    expect(acquire).toHaveBeenCalledOnce();
    expect(s.started).toBe(1);
    expect(r.isRecording()).toBe(true);
  });

  it('stops, uploads the assembled blob, and releases the stream', async () => {
    const blob = new Blob(['x'], { type: 'audio/webm' });
    const s = sink(blob);
    const upload = vi.fn(async () => undefined);
    const r = createSessionRecorder({ acquire: async () => s, upload });
    await r.start();
    await r.stop();
    expect(upload).toHaveBeenCalledWith(blob);
    expect(s.released).toBe(1);
    expect(r.isRecording()).toBe(false);
  });

  it('is idempotent — a second stop does nothing', async () => {
    const s = sink();
    const upload = vi.fn(async () => undefined);
    const r = createSessionRecorder({ acquire: async () => s, upload });
    await r.start();
    await r.stop();
    await r.stop();
    expect(upload).toHaveBeenCalledOnce();
    expect(s.released).toBe(1);
  });

  it('treats an acquire failure as non-fatal — reports it and never throws', async () => {
    const onError = vi.fn();
    const r = createSessionRecorder({ acquire: async () => { throw new Error('denied'); }, upload: vi.fn(), onError });
    await expect(r.start()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
    expect(r.isRecording()).toBe(false);
  });

  it('treats an upload failure as non-fatal — reports it and still releases', async () => {
    const s = sink();
    const onError = vi.fn();
    const r = createSessionRecorder({ acquire: async () => s, upload: async () => { throw new Error('offline'); }, onError });
    await r.start();
    await expect(r.stop()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
    expect(s.released).toBe(1);
    expect(r.isRecording()).toBe(false);
  });

  it('stop before start is a no-op', async () => {
    const upload = vi.fn(async () => undefined);
    const r = createSessionRecorder({ acquire: async () => sink(), upload });
    await r.stop();
    expect(upload).not.toHaveBeenCalled();
  });

  it('releases the sink and stays non-fatal when start throws after acquire', async () => {
    const released = vi.fn();
    const s = { start: () => { throw new Error('recorder start failed'); }, stop: vi.fn(async () => new Blob()), release: released };
    const onError = vi.fn();
    const r = createSessionRecorder({ acquire: async () => s as unknown as RecorderSink, upload: vi.fn(async () => undefined), onError });
    await expect(r.start()).resolves.toBeUndefined();
    expect(released).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
    expect(r.isRecording()).toBe(false);
  });

  it('does not double-acquire when start is called twice before the first resolves', async () => {
    const s = sink();
    let resolveAcquire: () => void = () => undefined;
    const acquire = vi.fn(() => new Promise<RecorderSink>((res) => { resolveAcquire = () => res(s as unknown as RecorderSink); }));
    const r = createSessionRecorder({ acquire, upload: vi.fn(async () => undefined) });
    const p1 = r.start();
    const p2 = r.start(); // second call while the first acquire is still pending
    resolveAcquire();
    await Promise.all([p1, p2]);
    expect(acquire).toHaveBeenCalledOnce();
    expect(s.started).toBe(1);
    expect(r.isRecording()).toBe(true);
  });
});
