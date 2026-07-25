'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/features/defense/components/app-shell';
import { RehearseSetup, buildRehearseSessionPayload, type RehearseConfig } from '@/features/defense/components/rehearse-setup';
import { RehearseSourcePicker, type RehearseSource } from '@/features/defense/components/rehearse-source-picker';
import { TopicSetup } from '@/features/defense/components/topic-setup';
import { buildTopicSessionPayload, type TopicConfig } from '@/features/defense/components/topic-session';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { useOnboardingGuard } from '@/features/onboarding/use-onboarding';

export function isAuthenticationRejected(status: number): boolean {
  return status === 401 || status === 403;
}

export function sessionCreateFailureMessage(response: { status: number }, data: unknown): string | null {
  if (isAuthenticationRejected(response.status)) return 'Your session has ended. Sign in again to continue.';
  if (response.status < 400) return null;
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error) return data.error;
  return 'Unable to create the rehearsal session.';
}

export function SignInRecovery(): React.ReactElement {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
      Your session has ended. Sign in again to continue.
      <a className="ml-2 font-medium underline underline-offset-4" href="/login">Sign in</a>
    </div>
  );
}

export default function NewDeckPage() {
  useOnboardingGuard();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [source, setSource] = useState<RehearseSource>('deck');

  const createSession = async (payload: unknown) => {
    setCreating(true);
    setError(undefined);
    try {
      const response = await authenticatedFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      const failure = sessionCreateFailureMessage(response, data);
      if (failure) throw new Error(failure);
      if (!data.sessionId) throw new Error('Unable to create the rehearsal session.');
      router.push(`/rehearse/${data.sessionId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the rehearsal session.');
    } finally {
      setCreating(false);
    }
  };

  const start = (config: RehearseConfig) => void createSession(buildRehearseSessionPayload(config));
  const startTopic = (config: TopicConfig) => void createSession(buildTopicSessionPayload(config));

  if (loading) return null;
  if (!user) return <AppShell active="rehearse"><SignInRecovery /></AppShell>;
  return (
    <AppShell active="rehearse">
      <div className="flex flex-col gap-6">
        <RehearseSourcePicker source={source} onSelect={setSource} />
        {source === 'deck' ? (
          <RehearseSetup creating={creating} startError={error} onStart={start} onDeckChange={() => setError(undefined)} />
        ) : (
          <TopicSetup creating={creating} startError={error} onStart={startTopic} />
        )}
      </div>
    </AppShell>
  );
}
