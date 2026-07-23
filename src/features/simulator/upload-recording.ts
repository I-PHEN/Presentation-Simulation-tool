import { authenticatedFetch } from '@/lib/authenticated-fetch';

export async function uploadSessionAudio(
  sessionId: string,
  blob: Blob,
  fetcher: typeof fetch = authenticatedFetch,
): Promise<void> {
  const form = new FormData();
  form.append('audio', blob, `${sessionId}.webm`);
  const response = await fetcher(`/api/session/${sessionId}/audio`, { method: 'POST', body: form });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof (body as { error?: unknown }).error === 'string' ? (body as { error: string }).error : 'Failed to upload the recording.');
  }
}
