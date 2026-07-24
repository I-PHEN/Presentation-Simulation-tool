'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/features/defense/components/app-shell';
import { ProgressWorkspace } from '@/features/defense/components/progress-workspace';
import { buildProgressModel } from '@/features/coaching/progress-model';
import { useDefenseSessions } from '@/features/defense/use-defense-sessions';
import { useSpeakerProfile } from '@/hooks/use-speaker-profile';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * useDefenseSessions fetches on mount, which can race ahead of Firebase
 * resolving the signed-in user and fail with 401 before a retry is ever
 * triggered. Once auth confirms a signed-in user we need exactly one fresh
 * authenticated fetch - never more than once - so a slow auth handshake
 * never strands the workspace on a spurious error banner, and so we never loop.
 */
export function shouldResyncAfterAuth(authLoading: boolean, user: unknown, resyncedAfterAuth: boolean): boolean {
  return !authLoading && Boolean(user) && !resyncedAfterAuth;
}

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { sessions, loading: sessionsLoading, error, retry } = useDefenseSessions();
  const { profile } = useSpeakerProfile();
  const [resyncedAfterAuth, setResyncedAfterAuth] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, router, user]);

  useEffect(() => {
    if (shouldResyncAfterAuth(authLoading, user, resyncedAfterAuth)) {
      setResyncedAfterAuth(true);
      retry();
    }
  }, [authLoading, user, resyncedAfterAuth, retry]);

  if (authLoading || !user) return <div className="min-h-dvh bg-background" aria-busy="true" />;

  return (
    <AppShell active="progress">
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
          <span className="sr-only">Loading your progress...</span>
          <div aria-hidden="true" className="flex animate-pulse flex-col gap-3">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-8 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        </div>
      ) : (
        <ProgressWorkspace
          model={buildProgressModel(
            profile,
            sessions.map((s) => ({ ...s, createdAt: String(s.createdAt) }))
          )}
        />
      )}
    </AppShell>
  );
}
