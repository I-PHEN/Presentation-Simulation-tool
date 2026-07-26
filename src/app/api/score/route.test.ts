import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, getZAI } = vi.hoisted(() => ({ findUnique: vi.fn(), getZAI: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { session: { findUnique }, score: {} } }));
vi.mock('@/lib/zai', () => ({ getZAI }));
import { POST } from './route';

describe('POST /api/score', () => {
  beforeEach(() => { findUnique.mockReset(); getZAI.mockReset(); });
  it('does not send a defense session to generic scoring', async () => {
    findUnique.mockResolvedValue({ id: 's1', practiceMode: 'defense' });
    const response = await POST(new Request('http://localhost/api/score', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId: 's1' }) }));
    expect(response.status).toBe(409); expect(getZAI).not.toHaveBeenCalled();
  });
});
