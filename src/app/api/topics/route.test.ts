import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, getZAI, create } = vi.hoisted(() => ({ findUnique: vi.fn(), getZAI: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { user: { findUnique } } }));
vi.mock('@/lib/server-auth', () => ({
  authenticateRequest: vi.fn().mockResolvedValue({ userId: 'user-1' }),
  isAuthenticationFailure: () => false,
}));
vi.mock('@/lib/zai', () => ({ getZAI }));
import { POST } from './route';
import { DEFAULT_TOPICS } from '@/features/onboarding/topics';

const req = () => new Request('http://localhost/api/topics', { method: 'POST' }) as never;

describe('POST /api/topics', () => {
  beforeEach(() => { findUnique.mockReset(); getZAI.mockReset(); create.mockReset(); });

  it('returns model topics grounded in the user interests', async () => {
    findUnique.mockResolvedValue({ interests: JSON.stringify(['Space']) });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    create.mockResolvedValue({ choices: [{ message: { content: '["Is space tourism worth the cost?", "Should we colonize Mars?"]' } }] });
    const res = await POST(req());
    const body = await res.json();
    expect(body.topics).toEqual(['Is space tourism worth the cost?', 'Should we colonize Mars?']);
  });

  it('falls back to defaults when the model returns nothing usable', async () => {
    findUnique.mockResolvedValue({ interests: '[]' });
    getZAI.mockResolvedValue({ chat: { completions: { create } } });
    create.mockResolvedValue({ choices: [{ message: { content: 'sorry, no' } }] });
    const res = await POST(req());
    const body = await res.json();
    expect(body.topics).toEqual([...DEFAULT_TOPICS]);
  });

  it('falls back to defaults when the model call throws', async () => {
    findUnique.mockResolvedValue({ interests: '[]' });
    getZAI.mockRejectedValue(new Error('no key'));
    const res = await POST(req());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.topics).toEqual([...DEFAULT_TOPICS]);
  });
});
