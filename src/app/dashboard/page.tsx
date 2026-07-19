'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { AppShell } from '@/features/defense/components/app-shell';
import { StudioDesk } from '@/features/defense/components/studio-desk';
import { buildTodayModel } from '@/features/defense/studio-session-model';
import { useDefenseSessions } from '@/features/defense/use-defense-sessions';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { sessions, loading: sessionsLoading, error, retry } = useDefenseSessions();
  const [resyncedAfterAuth, setResyncedAfterAuth] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, router, user]);

  // useDefenseSessions fetches on mount, which can race ahead of Firebase
  // resolving the signed-in user. Once auth is confirmed, force one fresh
  // authenticated fetch so a slow auth handshake never strands the desk on
  // a spurious error from an earlier unauthenticated attempt.
  useEffect(() => {
    if (!authLoading && user && !resyncedAfterAuth) {
      setResyncedAfterAuth(true);
      retry();
    }
  }, [authLoading, user, resyncedAfterAuth, retry]);

  if (authLoading || !user) return <div className="min-h-dvh bg-background" aria-busy="true" />;

  return (
    <AppShell active="today">
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
          Loading your studio...
        </p>
      ) : (
        <StudioDesk model={buildTodayModel(sessions)} />
      )}
    </AppShell>
  );
}
