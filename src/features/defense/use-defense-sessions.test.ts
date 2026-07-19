import { describe, expect, it } from 'vitest';
import { loadDefenseSessions } from './use-defense-sessions';
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

  it('throws when the authenticated session request fails', async () => {
    await expect(loadDefenseSessions(async () => new Response('{}', { status: 500 }))).rejects.toThrow('Unable to load your sessions.');
  });
});
