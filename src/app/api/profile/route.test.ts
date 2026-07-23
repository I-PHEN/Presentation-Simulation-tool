import { describe, expect, it, vi, beforeEach } from 'vitest';

const authenticateRequest = vi.fn();
const isAuthenticationFailure = vi.fn();
const getOrCreateProfile = vi.fn();
vi.mock('@/lib/server-auth', () => ({ authenticateRequest: (...a: unknown[]) => authenticateRequest(...a), isAuthenticationFailure: (...a: unknown[]) => isAuthenticationFailure(...a) }));
vi.mock('@/features/coaching/speaker-profile-repository', () => ({ getOrCreateProfile: (...a: unknown[]) => getOrCreateProfile(...a) }));

import { GET } from './route';

describe('GET /api/profile', () => {
  beforeEach(() => { authenticateRequest.mockReset(); isAuthenticationFailure.mockReset(); getOrCreateProfile.mockReset(); });

  it("returns the authenticated user's profile", async () => {
    authenticateRequest.mockResolvedValue({ userId: 'u1' });
    isAuthenticationFailure.mockReturnValue(false);
    getOrCreateProfile.mockResolvedValue({ recurringWeaknesses: [], dimensionBaselines: {}, totalSessions: 2, streak: 0, nextFocus: 'Rushing closings' });
    const res = await GET(new Request('http://localhost/api/profile'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile.nextFocus).toBe('Rushing closings');
    expect(getOrCreateProfile).toHaveBeenCalledWith('u1');
  });

  it('propagates an auth failure response', async () => {
    const failure = new Response('no', { status: 401 });
    authenticateRequest.mockResolvedValue(failure);
    isAuthenticationFailure.mockReturnValue(true);
    const res = await GET(new Request('http://localhost/api/profile'));
    expect(res.status).toBe(401);
    expect(getOrCreateProfile).not.toHaveBeenCalled();
  });
});
