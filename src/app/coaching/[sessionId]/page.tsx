'use client';

import { use } from 'react';
import { CoachingRoom } from '@/features/coaching/components/coaching-room';
import { useOnboardingGuard } from '@/features/onboarding/use-onboarding';

export default function CoachingRoomPage({ params }: { params: Promise<{ sessionId: string }> }) {
  useOnboardingGuard();
  const { sessionId } = use(params);

  return <CoachingRoom sessionId={sessionId} />;
}
