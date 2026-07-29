'use client';

import { AppShell } from '@/features/defense/components/app-shell';
import { CoachingSetup } from '@/features/coaching/components/coaching-setup';
import { useOnboardingGuard } from '@/features/onboarding/use-onboarding';

export default function NewCoachingPage() {
  useOnboardingGuard();

  return (
    <AppShell active="coaching">
      <CoachingSetup />
    </AppShell>
  );
}
