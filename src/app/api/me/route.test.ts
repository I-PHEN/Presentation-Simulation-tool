import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upsert, findUnique, update } = vi.hoisted(() => ({ upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { user: { upsert, findUnique, update } } }));
vi.mock('@/lib/server-auth', () => ({
  authenticateRequest: vi.fn().mockResolvedValue({ userId: 'user-1' }),
  isAuthenticationFailure: () => false,
}));
import { GET, PUT } from './route';

const req = (method: string, body?: unknown) =>
  new Request('http://localhost/api/me', {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  }) as never;

describe('GET /api/me', () => {
  beforeEach(() => { upsert.mockReset(); findUnique.mockReset(); update.mockReset(); });

  it('returns normalized interests and the onboarding stamp', async () => {
    upsert.mockResolvedValue({ interests: JSON.stringify(['AI', 'ai', 'Space']), onboardedAt: new Date('2026-07-25T00:00:00.000Z') });
    const res = await GET(req('GET'));
    const body = await res.json();
    expect(body.interests).toEqual(['AI', 'Space']);
    expect(body.onboardedAt).toBe('2026-07-25T00:00:00.000Z');
  });

  it('returns an empty list and null stamp for a fresh user', async () => {
    upsert.mockResolvedValue({ interests: '[]', onboardedAt: null });
    const res = await GET(req('GET'));
    const body = await res.json();
    expect(body).toEqual({ interests: [], onboardedAt: null });
  });
});

describe('PUT /api/me', () => {
  beforeEach(() => { upsert.mockReset(); findUnique.mockReset(); update.mockReset(); });

  it('saves normalized interests and stamps onboardedAt the first time', async () => {
    upsert.mockResolvedValue({});
    findUnique.mockResolvedValue({ onboardedAt: null });
    update.mockResolvedValue({ interests: JSON.stringify(['AI', 'History']), onboardedAt: new Date('2026-07-25T12:00:00.000Z') });
    const res = await PUT(req('PUT', { interests: ['AI', 'ai', 'History'], onboarded: true }));
    const body = await res.json();
    expect(body.interests).toEqual(['AI', 'History']);
    expect(body.onboardedAt).toBe('2026-07-25T12:00:00.000Z');
    const data = update.mock.calls[0][0].data;
    expect(data.interests).toBe(JSON.stringify(['AI', 'History']));
    expect(data.onboardedAt).toBeInstanceOf(Date);
  });

  it('does not re-stamp onboardedAt when it is already set', async () => {
    upsert.mockResolvedValue({});
    findUnique.mockResolvedValue({ onboardedAt: new Date('2026-01-01T00:00:00.000Z') });
    update.mockResolvedValue({ interests: '[]', onboardedAt: new Date('2026-01-01T00:00:00.000Z') });
    await PUT(req('PUT', { interests: [], onboarded: true }));
    const data = update.mock.calls[0][0].data;
    expect('onboardedAt' in data).toBe(false);
  });
});
