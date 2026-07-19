'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/features/defense/components/app-shell';
import { DeckIntake } from '@/features/defense/components/deck-intake';
import type { DeckContext } from '@/features/defense/types';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export function createDefenseSessionPayload(deck: DeckContext) {
  return { title: deck.sourceName, mode: 'diagnostic' as const, stance: 'rigorous' as const, deck };
}

export function continuationBlockMessage({ hasUser, hasDeck }: { hasUser: boolean; hasDeck: boolean }): string | null {
  if (!hasDeck) return 'Your uploaded deck is no longer available. Select it again to continue.';
  if (!hasUser) return 'Your session has ended. Sign in again to continue.';
  return null;
}

export function isAuthenticationRejected(status: number): boolean {
  return status === 401 || status === 403;
}

export function continuationRequestFailureMessage(response: { status: number }, data: unknown): string | null {
  if (isAuthenticationRejected(response.status)) return continuationBlockMessage({ hasUser: false, hasDeck: true });
  if (response.status < 400) return null;
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' && data.error) return data.error;
  return 'Unable to create the defense session.';
}

export function DeckContinuationRecovery({ hasUser, hasDeck }: { hasUser: boolean; hasDeck: boolean }): React.ReactElement | null {
  const message = continuationBlockMessage({ hasUser, hasDeck });
  if (!message) return null;
  return <p id="deck-continuation-error" className="mt-4 text-sm text-destructive" role="alert">{message}{!hasUser && <a className="ml-2 font-medium underline underline-offset-4" href="/login">Sign in</a>}</p>;
}

export function DeckContinuationError({ error, authRecovery }: { error: string; authRecovery: boolean }): React.ReactElement {
  if (authRecovery) return <DeckContinuationRecovery hasUser={false} hasDeck />;
  return <p id="deck-continuation-error" className="mt-4 text-sm text-destructive" role="alert">{error}</p>;
}

export function DeckContinuationAction({ creating, error, onContinue }: { creating: boolean; error?: string; onContinue: () => void }): React.ReactElement {
  return <button type="button" onClick={onContinue} disabled={creating} aria-describedby={error ? 'deck-continuation-error' : undefined} className="mt-6 border border-foreground bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60">{creating ? 'Creating your defense session...' : 'Continue to defense setup'}</button>;
}

export default function NewDeckPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [deck, setDeck] = useState<DeckContext>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const [authRecovery, setAuthRecovery] = useState(false);

  const continueToPractice = async () => {
    const blockMessage = continuationBlockMessage({ hasUser: Boolean(user), hasDeck: Boolean(deck) });
    if (blockMessage) {
      setError(blockMessage);
      return;
    }
    setCreating(true);
    setError(undefined);
    setAuthRecovery(false);
    try {
      const response = await authenticatedFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createDefenseSessionPayload(deck)),
      });
      const data = await response.json();
      const failureMessage = continuationRequestFailureMessage(response, data);
      if (failureMessage) {
        setAuthRecovery(isAuthenticationRejected(response.status));
        throw new Error(failureMessage);
      }
      if (!data.sessionId) throw new Error('Unable to create the defense session.');
      router.push(`/practice/${data.sessionId}?view=setup`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the defense session.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return null;
  if (!user) return <AppShell active="practice"><DeckContinuationRecovery hasUser={false} hasDeck={Boolean(deck)} /></AppShell>;
  return <AppShell active="practice"><DeckIntake onDeckReady={(readyDeck) => { setDeck(readyDeck); setError(undefined); setAuthRecovery(false); }} onDeckInvalidated={() => { setDeck(undefined); setError(undefined); setAuthRecovery(false); }} />{deck && <DeckContinuationAction creating={creating} error={error} onContinue={() => void continueToPractice()} />}{error && <DeckContinuationError error={error} authRecovery={authRecovery} />}</AppShell>;
}
