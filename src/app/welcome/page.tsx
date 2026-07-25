'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { InterestsPicker } from '@/features/onboarding/interests-picker';
import { addCustomInterest, normalizeInterests, toggleInterest } from '@/features/onboarding/interests';

export default function WelcomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Seed from any interests the user already saved, so returning here is non-destructive.
  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    (async () => {
      try {
        const response = await authenticatedFetch('/api/me');
        if (!response.ok) return;
        const body = await response.json();
        if (active) setSelected(normalizeInterests(body.interests));
      } catch { /* seeding is best-effort */ }
    })();
    return () => { active = false; };
  }, [loading, user]);

  const save = async (interests: string[]) => {
    setSaving(true);
    try {
      await authenticatedFetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interests, onboarded: true }),
      });
      router.replace('/dashboard');
    } catch {
      setSaving(false);
    }
  };

  if (loading || !user) return <div className="min-h-dvh bg-background" aria-busy="true" />;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-6 py-12">
      <div className="rounded-xl border border-border bg-card p-6 shadow-e2 sm:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <p className="text-xs font-medium text-muted-foreground">Welcome to Sparring Partner</p>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          What do you want to get better at speaking about?
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Pick a few interests and we&#x27;ll suggest topics you can rehearse without slides. You can change these anytime.
        </p>
        <div className="mt-8">
          <InterestsPicker
            selected={selected}
            onToggle={(label) => setSelected((current) => toggleInterest(current, label))}
            onAddCustom={(label) => setSelected((current) => addCustomInterest(current, label))}
            onContinue={() => void save(selected)}
            onSkip={() => void save([])}
            saving={saving}
          />
        </div>
      </div>
    </main>
  );
}
