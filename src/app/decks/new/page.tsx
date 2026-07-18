'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/features/defense/components/app-shell';
import { DeckIntake } from '@/features/defense/components/deck-intake';
import type { DeckContext } from '@/features/defense/types';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export function createDefenseSessionPayload(deck: DeckContext) {
  return { title: deck.sourceName, mode: 'diagnostic' as const, stance: 'rigorous' as const, deck };
}

export default function NewDeckPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [deck, setDeck] = useState<DeckContext>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => { if (!loading && !user) router.replace('/login'); }, [loading, router, user]);

  const continueToPractice = async () => {
    if (!user || !deck) return;
    setCreating(true);
    setError(undefined);
    try {
      const response = await authenticatedFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createDefenseSessionPayload(deck)),
      });
      const data = await response.json();
      if (!response.ok || !data.sessionId) throw new Error(data.error || 'Unable to create the defense session.');
      router.push(`/practice/${data.sessionId}?view=setup`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create the defense session.');
    } finally {
      setCreating(false);
    }
  };

  if (loading || !user) return null;
  return <AppShell active="decks"><DeckIntake onDeckReady={setDeck} onDeckInvalidated={() => setDeck(undefined)} />{deck && <button type="button" onClick={() => void continueToPractice()} className="mt-6 border border-foreground bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-85">Continue to practice</button>}{creating && <p className="mt-4 text-sm text-muted-foreground" role="status">Creating your defense session...</p>}{error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}</AppShell>;
}
