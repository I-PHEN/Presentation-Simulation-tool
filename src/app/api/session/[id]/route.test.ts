import { beforeEach, describe, expect, it, vi } from 'vitest';

const { update, findFirst } = vi.hoisted(() => ({ update: vi.fn(), findFirst: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: { session: { update, findFirst } },
}));
vi.mock('@/lib/server-auth', () => ({ authenticateRequest: vi.fn().mockResolvedValue({ userId: 'user-1' }), isAuthenticationFailure: () => false }));

import { PATCH } from './route';

describe('PATCH /api/session/[id]', () => {
  beforeEach(() => {
    update.mockReset();
    findFirst.mockReset();
    findFirst.mockResolvedValue({ id: 'session-1', practiceMode: 'defense' });
  });

  it('updates valid mode and stance without replacing deck context', async () => {
    update.mockResolvedValue({ id: 'session-1', mode: 'mock', stance: 'supportive', deckContext: '{"sourceName":"Thesis.pdf"}' });

    const response = await PATCH(
      new Request('http://localhost/api/session/session-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'mock', stance: 'supportive' }),
      }) as never,
      { params: Promise.resolve({ id: 'session-1' }) },
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { mode: 'mock', stance: 'supportive' },
    });
  });

  it('rejects invalid mode or stance before modifying deck context', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/session/session-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'unsupported', stance: 'rigorous', deckContext: '{"changed":true}' }),
      }) as never,
      { params: Promise.resolve({ id: 'session-1' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'Invalid defense session update' });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects unsupported fields instead of accepting a replacement deck context', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/session/session-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'mock', stance: 'rigorous', deckContext: '{"changed":true}' }),
      }) as never,
      { params: Promise.resolve({ id: 'session-1' }) },
    );

    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('returns a client-facing 400 for malformed JSON without updating the session', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/session/session-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{not-json',
      }) as never,
      { params: Promise.resolve({ id: 'session-1' }) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'Invalid defense session update' });
    expect(update).not.toHaveBeenCalled();
  });

  it('serializes valid rehearsal arrays and status while rejecting malformed persisted state', async () => {
    update.mockResolvedValue({ id: 'session-1' });
    const transcriptSegments = [{ role: 'presenter', slideIndex: 1, text: 'A grounded explanation.', startedAtMs: 0, endedAtMs: 30 }];
    const examinerEvents = [{ kind: 'question', text: 'What supports that?', slideIndex: 1, evidence: 'Slide claim: Opening', occurredAtMs: 31 }];
    const valid = await PATCH(new Request('http://localhost/api/session/session-1', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcriptSegments, examinerEvents, status: 'practicing' }) }) as never, { params: Promise.resolve({ id: 'session-1' }) });
    expect(valid.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: 'session-1' }, data: { transcriptSegments: JSON.stringify(transcriptSegments), examinerEvents: JSON.stringify(examinerEvents), status: 'practicing' } });

    update.mockClear();
    const invalid = await PATCH(new Request('http://localhost/api/session/session-1', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transcriptSegments: [{ role: 'presenter', slideIndex: 1, text: 'bad', startedAtMs: 4, endedAtMs: 3 }] }) }) as never, { params: Promise.resolve({ id: 'session-1' }) });
    expect(invalid.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects rehearsal persistence for a non-defense target session', async () => {
    findFirst.mockResolvedValue({ id: 'session-1', practiceMode: 'full' });
    const response = await PATCH(new Request('http://localhost/api/session/session-1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'practicing' }),
    }) as never, { params: Promise.resolve({ id: 'session-1' }) });
    expect(response.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it('does not modify a session that is not owned by the authenticated user', async () => {
    findFirst.mockResolvedValue(null);
    const response = await PATCH(new Request('http://localhost/api/session/other-user-session', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'mock' }),
    }) as never, { params: Promise.resolve({ id: 'other-user-session' }) });
    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'other-user-session', userId: 'user-1' }, select: { id: true } });
  });
});
