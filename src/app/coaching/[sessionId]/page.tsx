'use client';

import { useEffect, useState } from 'react';
import { CoachingRoom } from '@/features/coaching/components/coaching-room';
import { useOnboardingGuard } from '@/features/onboarding/use-onboarding';

export default function CoachingRoomPage({ params }: { params: Promise<{ sessionId: string }> | { sessionId: string } }) {
  useOnboardingGuard();
  const [sessionId, setSessionId] = useState<string>(() => {
    if (params && typeof (params as unknown as Promise<unknown>).then !== 'function') {
      return (params as { sessionId: string }).sessionId;
    }
    return '';
  });

  useEffect(() => {
    if (params && typeof (params as unknown as Promise<unknown>).then === 'function') {
      void (params as Promise<{ sessionId: string }>).then(({ sessionId: value }) => setSessionId(value));
    } else if (params && 'sessionId' in params) {
      setSessionId((params as { sessionId: string }).sessionId);
    }
  }, [params]);

  if (!sessionId) return <p role="status" className="p-6 text-sm text-muted-foreground">Opening your Guided Coaching Room...</p>;

  return <CoachingRoom sessionId={sessionId} />;
}

