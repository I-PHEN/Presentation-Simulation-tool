'use client';

import { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import type { StudioSession } from './studio-session-model';

export async function loadDefenseSessions(fetcher: typeof authenticatedFetch = authenticatedFetch): Promise<StudioSession[]> {
  const response = await fetcher('/api/sessions');
  if (!response.ok) throw new Error('Unable to load your sessions.');
  const body = await response.json() as { sessions?: StudioSession[] };
  return body.sessions ?? [];
}

export type UseDefenseSessionsResult = {
  sessions: StudioSession[];
  loading: boolean;
  error: string | undefined;
  retry: () => void;
};

export function useDefenseSessions(): UseDefenseSessionsResult {
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    loadDefenseSessions()
      .then((loaded) => { if (active) setSessions(loaded); })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your sessions.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  return { sessions, loading, error, retry };
}
