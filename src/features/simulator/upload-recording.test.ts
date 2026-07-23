import { describe, expect, it, vi } from 'vitest';
import { uploadSessionAudio } from './upload-recording';

describe('uploadSessionAudio', () => {
  it('posts the blob as multipart form-data to the session audio route', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }));
    const blob = new Blob(['x'], { type: 'audio/webm' });
    await uploadSessionAudio('sess-1', blob, fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/session/sess-1/audio');
    expect(init.method).toBe('POST');
    const form = init.body as FormData;
    expect(form.get('audio')).toBeInstanceOf(Blob);
  });

  it('throws when the server rejects the upload', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: 'nope' }), { status: 500 }));
    await expect(uploadSessionAudio('sess-1', new Blob(['x']), fetcher as unknown as typeof fetch)).rejects.toThrow();
  });
});
