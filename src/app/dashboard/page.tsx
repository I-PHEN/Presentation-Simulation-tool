'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/features/defense/components/app-shell';
import { Greeting } from '@/features/defense/components/greeting';
import { StudioDesk } from '@/features/defense/components/studio-desk';
import { TodaysTopicCard } from '@/features/defense/components/todays-topic-card';
import { RecentSessionsCard } from '@/features/defense/components/recent-sessions-card';
import { StatsSnapshot } from '@/features/defense/components/stats-snapshot';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { buildTodayModel } from '@/features/defense/studio-session-model';
import { deleteDefenseSession, useDefenseSessions } from '@/features/defense/use-defense-sessions';
import { useSpeakerProfile } from '@/hooks/use-speaker-profile';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboardingGuard } from '@/features/onboarding/use-onboarding';

/**
 * useDefenseSessions fetches on mount, which can race ahead of Firebase
 * resolving the signed-in user and fail with 401 before a retry is ever
 * triggered. Once auth confirms a signed-in user we need exactly one fresh
 * authenticated fetch - never more than once - so a slow auth handshake
 * never strands the desk on a spurious error banner, and so we never loop.
 */
export function shouldResyncAfterAuth(authLoading: boolean, user: unknown, resyncedAfterAuth: boolean): boolean {
  return !authLoading && Boolean(user) && !resyncedAfterAuth;
}

export default function DashboardPage() {
  useOnboardingGuard();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { sessions, loading: sessionsLoading, error, retry } = useDefenseSessions();
  const { profile } = useSpeakerProfile();
  const [resyncedAfterAuth, setResyncedAfterAuth] = useState(false);
  const [todaysTopic, setTodaysTopic] = useState<string>();
  const [hasInterests, setHasInterests] = useState(false);
  const [removeError, setRemoveError] = useState<string>();

  // Refetch rather than filter locally, so Home never disagrees with the server.
  const removeSession = async (id: string) => {
    setRemoveError(undefined);
    try {
      await deleteDefenseSession(id);
      retry();
    } catch (caught) {
      setRemoveError(caught instanceof Error ? caught.message : 'Unable to remove that rehearsal.');
    }
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, router, user]);

  // Surface one recommended topic once we know the user has interests. Never
  // fetch a topic without interests - that would show a generic default as if
  // it were tailored.
  useEffect(() => {
    if (authLoading || !user) return;
    let active = true;
    (async () => {
      try {
        const meResponse = await authenticatedFetch('/api/me');
        const me = meResponse.ok ? await meResponse.json() : { interests: [] };
        const interested = Array.isArray(me.interests) && me.interests.length > 0;
        if (!active) return;
        setHasInterests(interested);
        if (!interested) return;
        const topicsResponse = await authenticatedFetch('/api/topics', { method: 'POST' });
        const body = topicsResponse.ok ? await topicsResponse.json() : { topics: [] };
        if (active && Array.isArray(body.topics) && body.topics.length > 0) setTodaysTopic(body.topics[0]);
      } catch {
        /* the topic card is additive; a failure just leaves the invite state */
      }
    })();
    return () => { active = false; };
  }, [authLoading, user]);

  useEffect(() => {
    if (shouldResyncAfterAuth(authLoading, user, resyncedAfterAuth)) {
      setResyncedAfterAuth(true);
      retry();
    }
  }, [authLoading, user, resyncedAfterAuth, retry]);

  if (authLoading || !user) return <div className="min-h-dvh bg-background" aria-busy="true" />;

  return (
    <AppShell active="home">
      {error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={retry}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-4')}
          >
            Retry
          </button>
        </div>
      ) : sessionsLoading ? (
        <div role="status" className="rounded-xl border border-border bg-card p-6">
          <span className="sr-only">Loading your studio...</span>
          <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ) : (
        (() => {
          const model = buildTodayModel(sessions);
          const displayName = user.displayName && user.displayName !== 'Guest User' ? user.displayName.split(' ')[0] : undefined;
          return (
            <div className="flex flex-col gap-8">
              <Greeting name={displayName} hasActive={Boolean(model.active)} />
              <StudioDesk model={model} focus={profile.nextFocus} onRemove={(id) => void removeSession(id)} />
              {removeError && <p role="alert" className="text-sm text-destructive">{removeError}</p>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TodaysTopicCard topic={todaysTopic} hasInterests={hasInterests} />
                <RecentSessionsCard recent={model.recent} onRemove={(id) => void removeSession(id)} />
                <StatsSnapshot profile={profile} />
              </div>
            </div>
          );
        })()
      )}
    </AppShell>
  );
}
