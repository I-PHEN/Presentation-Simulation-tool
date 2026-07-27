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
import { Calendar, Clock, ExternalLink, Sparkles, X } from 'lucide-react';
import { ScheduleModal, ScheduledPracticeItem } from '@/features/scheduling/schedule-modal';

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
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [upcomingItem, setUpcomingItem] = useState<ScheduledPracticeItem | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('upcoming_rehearsal');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && new Date(parsed.targetDate) > new Date()) {
            setUpcomingItem(parsed);
          }
        } catch { /* ignore */ }
      }
    }
  }, []);

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
              {/* Top Header Row with Greeting & Schedule Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                <Greeting name={displayName} hasActive={Boolean(model.active)} />
                <button
                  type="button"
                  onClick={() => setIsScheduleOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-all shrink-0 shadow-sm"
                >
                  <Calendar className="size-4" /> Schedule Practice Block
                </button>
              </div>

              {/* Upcoming Scheduled Practice Banner */}
              {upcomingItem && (
                <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-background to-background p-5 shadow-e2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                      <Clock className="size-3.5" /> Upcoming Scheduled Practice
                    </div>
                    <h3 className="font-semibold text-base text-foreground">{upcomingItem.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Target: {new Date(upcomingItem.targetDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} • Material: {upcomingItem.sourceName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <a
                      href={upcomingItem.googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-popover transition-colors"
                    >
                      <Calendar className="size-3.5 text-blue-500" /> Google Cal <ExternalLink className="size-3 opacity-60" />
                    </a>
                    <button
                      type="button"
                      onClick={() => router.push(upcomingItem.roomUrl)}
                      className={cn(buttonVariants({ size: 'sm' }), 'text-xs font-semibold')}
                    >
                      Enter Room Now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('upcoming_rehearsal');
                        setUpcomingItem(null);
                      }}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Dismiss reminder"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              <StudioDesk model={model} focus={profile.nextFocus} onRemove={(id) => void removeSession(id)} />
              {removeError && <p role="alert" className="text-sm text-destructive">{removeError}</p>}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <TodaysTopicCard topic={todaysTopic} hasInterests={hasInterests} />
                <RecentSessionsCard recent={model.recent} onRemove={(id) => void removeSession(id)} />
                <StatsSnapshot profile={profile} />
              </div>

              <ScheduleModal
                isOpen={isScheduleOpen}
                onClose={() => setIsScheduleOpen(false)}
                onScheduled={(item) => setUpcomingItem(item)}
              />
            </div>
          );
        })()
      )}
    </AppShell>
  );
}
