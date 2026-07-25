'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

/**
 * A signed-in user who has never finished onboarding (onboardedAt still null)
 * is sent to /welcome - but never when already there, so there is no loop.
 * `undefined` means "not yet fetched": we must not redirect on it.
 */
export function shouldRedirectToWelcome(onboardedAt: string | null | undefined, pathname: string | null): boolean {
  return onboardedAt === null && pathname !== '/welcome';
}

/**
 * Fetches the caller's onboarding stamp exactly once after auth resolves, then
 * redirects first-run users to /welcome. Guests included (they own a User row).
 * Any fetch failure is swallowed - the guard must never strand the app.
 */
export function useOnboardingGuard(): void {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const checked = useRef(false);
  const [onboardedAt, setOnboardedAt] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading || !user || checked.current) return;
    checked.current = true;
    (async () => {
      try {
        const response = await authenticatedFetch('/api/me');
        if (!response.ok) return;
        const body = await response.json();
        setOnboardedAt(typeof body.onboardedAt === 'string' ? body.onboardedAt : null);
      } catch {
        /* non-fatal: a failed guard fetch must not block the app */
      }
    })();
  }, [loading, user]);

  useEffect(() => {
    if (shouldRedirectToWelcome(onboardedAt, pathname)) router.replace('/welcome');
  }, [onboardedAt, pathname, router]);
}
