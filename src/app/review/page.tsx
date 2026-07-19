'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/features/defense/components/app-shell';
import { ReviewWorkspace } from '@/features/defense/components/review-workspace';
import { buildReviewRows } from '@/features/defense/studio-session-model';
import { useDefenseSessions } from '@/features/defense/use-defense-sessions';

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

export default function ReviewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { sessions, loading: sessionsLoading, error, retry } = useDefenseSessions();
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
    <AppShell active="review">
      {error ? (
        <div role="alert" className="border-y border-border py-10">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 inline-flex w-fit items-center justify-center border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface"
          >
            Retry
          </button>
        </div>
      ) : sessionsLoading ? (
        <p role="status" className="border-y border-border py-10 text-sm text-muted-foreground">
          Loading your session history...
        </p>
      ) : (
        <ReviewWorkspace rows={buildReviewRows(sessions)} />
      )}
    </AppShell>
  );
}
