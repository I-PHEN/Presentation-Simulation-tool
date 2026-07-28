import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upsert, create } = vi.hoisted(() => ({ upsert: vi.fn(), create: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: { user: { upsert }, session: { create } },
  ensureDbInitialized: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server-auth', () => ({
  authenticateRequest: vi.fn().mockResolvedValue({ userId: 'user-1' }),
  isAuthenticationFailure: () => false,
}));
import { POST } from './route';

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never);

const deck = { sourceName: 'thesis.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: 'slide-1.png' }] };

describe('POST /api/session', () => {
  beforeEach(() => { upsert.mockReset(); create.mockReset(); create.mockResolvedValue({ id: 'sess-1' }); });

  it('creates a deckless topic session with source "topic" and a synthetic one-card deck', async () => {
    const res = await post({ topic: 'Should AI be regulated?', mode: 'diagnostic', stance: 'rigorous' });
    const body = await res.json();
    expect(body.sessionId).toBe('sess-1');
    const data = create.mock.calls[0][0].data;
    expect(data.source).toBe('topic');
    expect(data.topic).toBe('Should AI be regulated?');
    expect(data.practiceMode).toBe('defense');
    expect(JSON.parse(data.deckContext).slides).toHaveLength(1);
  });

  it('still creates a deck session tagged source "deck"', async () => {
    const res = await post({ title: 'Thesis', mode: 'mock', stance: 'rigorous', deck });
    const body = await res.json();
    expect(body.sessionId).toBe('sess-1');
    const data = create.mock.calls[0][0].data;
    expect(data.source).toBe('deck');
    expect(data.practiceMode).toBe('defense');
  });

  it('rejects an invalid topic payload', async () => {
    const res = await post({ topic: '   ', mode: 'diagnostic', stance: 'rigorous' });
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});
