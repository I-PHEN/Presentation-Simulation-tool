'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/features/defense/components/app-shell';
import { CoachHome } from '@/features/defense/components/coach-home';
import { buildCoachHomeModel, type CoachHomeSession } from '@/features/defense/coach-home-model';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

type SessionsResponse = { sessions?: CoachHomeSession[] };

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<CoachHomeSession[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void authenticatedFetch('/api/sessions')
      .then(async (response) => response.ok ? response.json() : { sessions: [] })
      .then((data: SessionsResponse) => {
        if (active) setSessions(data.sessions ?? []);
      })
      .catch(() => {
        if (active) setSessions([]);
      });
    return () => { active = false; };
  }, [user]);

  if (authLoading || !user) return <div className="min-h-dvh bg-background" aria-busy="true" />;
  return (
    <AppShell active="overview">
      <CoachHome
        name={user.displayName?.split(' ')[0] || 'there'}
        model={buildCoachHomeModel(sessions)}
      />
    </AppShell>
  );
}
