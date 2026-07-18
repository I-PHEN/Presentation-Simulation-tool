'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { OverviewWorkspace } from '@/features/defense/components/overview-workspace';
import type { DeckContext } from '@/features/defense/types';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

type DefenseOverviewSession = {
  deck?: DeckContext;
  finding?: { title: string; evidence: string; drill: string };
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [latestSession, setLatestSession] = useState<DefenseOverviewSession>();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void authenticatedFetch('/api/sessions')
      .then(async (response) => response.ok ? response.json() : { sessions: [] })
      .then((data: { sessions?: DefenseOverviewSession[] }) => {
        if (active) setLatestSession(data.sessions?.[0]);
      })
      .catch(() => {
        if (active) setLatestSession(undefined);
      });
    return () => { active = false; };
  }, [user]);

  if (authLoading || !user) return <div className="min-h-dvh bg-background" aria-busy="true" />;
  return <OverviewWorkspace activeDeck={latestSession?.deck} latestFinding={latestSession?.finding} onStartHref="/decks/new" />;
}
