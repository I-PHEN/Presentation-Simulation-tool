'use client';

import { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import type { StudioSession } from './studio-session-model';

export async function loadDefenseSessions(fetcher: typeof authenticatedFetch = authenticatedFetch): Promise<StudioSession[]> {
  try {
    const response = await fetcher('/api/sessions');
    if (!response.ok) return [];
    const body = await response.json() as { sessions?: StudioSession[] };
    return body.sessions ?? [];
  } catch {
    return [];
  }
}

/** Removes a rehearsal for good. The route is ownership-checked server-side, so a
 * 404 here means it was someone else's or already gone. */
export async function deleteDefenseSession(id: string, fetcher: typeof authenticatedFetch = authenticatedFetch): Promise<void> {
  const response = await fetcher(`/api/session/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Unable to remove that rehearsal.');
}

export type UseDefenseSessionsResult = {
  sessions: StudioSession[];
  loading: boolean;
  error: string | undefined;
  retry: () => void;
};

let cachedSessions: StudioSession[] | null = null;

export function useDefenseSessions(): UseDefenseSessionsResult {
  const [sessions, setSessions] = useState<StudioSession[]>(cachedSessions ?? []);
  const [loading, setLoading] = useState(cachedSessions === null);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (cachedSessions === null) {
      setLoading(true);
    }
    setError(undefined);
    loadDefenseSessions()
      .then((loaded) => {
        cachedSessions = loaded;
        if (active) {
          setSessions(loaded);
        }
      })
      .catch((caught: unknown) => {
        if (active && cachedSessions === null) {
          setError(caught instanceof Error ? caught.message : 'Unable to load your sessions.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [attempt]);

  const retry = useCallback(() => {
    cachedSessions = null;
    setAttempt((value) => value + 1);
  }, []);

  return { sessions, loading, error, retry };
}
