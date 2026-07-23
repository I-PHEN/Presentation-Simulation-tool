import { describe, expect, it, vi } from 'vitest';
import { loadSpeakerProfile } from './use-speaker-profile';

describe('loadSpeakerProfile', () => {
  it('returns the profile from the api', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ profile: { recurringWeaknesses: [], dimensionBaselines: {}, totalSessions: 1, streak: 0, nextFocus: 'Pace' } }), { status: 200 }));
    const profile = await loadSpeakerProfile(fetcher as unknown as typeof fetch);
    expect(profile.nextFocus).toBe('Pace');
  });

  it('throws on a failed response', async () => {
    const fetcher = vi.fn(async () => new Response('no', { status: 500 }));
    await expect(loadSpeakerProfile(fetcher as unknown as typeof fetch)).rejects.toThrow();
  });
});
