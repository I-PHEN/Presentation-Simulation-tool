import { describe, expect, it, vi } from 'vitest';
import { deleteDefenseSession, loadDefenseSessions } from './use-defense-sessions';
import type { StudioSession } from './studio-session-model';

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('loadDefenseSessions', () => {
  it('returns the sessions supplied by the authenticated fetcher', async () => {
    const sessions: StudioSession[] = [
      { id: 'session-1', title: 'Final thesis defense', status: 'practicing', mode: 'diagnostic', stance: 'rigorous' },
    ];

    await expect(loadDefenseSessions(async () => jsonResponse({ sessions }))).resolves.toEqual(sessions);
  });

  it('defaults to an empty collection when the response omits a sessions field', async () => {
    await expect(loadDefenseSessions(async () => jsonResponse({}))).resolves.toEqual([]);
  });

  it('returns an empty array when the authenticated session request fails', async () => {
    await expect(loadDefenseSessions(async () => new Response('{}', { status: 500 }))).resolves.toEqual([]);
  });
});

describe('deleteDefenseSession', () => {
  it('deletes the session through the authenticated route', async () => {
    const fetcher = vi.fn(async () => jsonResponse({ success: true }));
    await deleteDefenseSession('session-1', fetcher);
    expect(fetcher).toHaveBeenCalledWith('/api/session/session-1', { method: 'DELETE' });
  });

  it('throws when the delete is rejected, so the caller can surface it', async () => {
    await expect(deleteDefenseSession('session-1', async () => new Response('{}', { status: 404 })))
      .rejects.toThrow('Unable to remove that rehearsal.');
  });
});
