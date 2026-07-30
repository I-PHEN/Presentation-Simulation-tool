'use client';

import { use, useEffect, useState } from 'react';
import { CoachingRoom } from '@/features/coaching/components/coaching-room';
import { useOnboardingGuard } from '@/features/onboarding/use-onboarding';

export default function CoachingRoomPage({ params }: { params: Promise<{ sessionId: string }> | { sessionId: string } }) {
  useOnboardingGuard();

  const resolvedParams = params && typeof (params as unknown as Promise<unknown>).then === 'function'
    ? use(params as Promise<{ sessionId: string }>)
    : (params as { sessionId: string });

  const [sessionId, setSessionId] = useState<string>(() => resolvedParams?.sessionId || '');

  useEffect(() => {
    if (resolvedParams?.sessionId) {
      setSessionId(resolvedParams.sessionId);
    } else if (params && typeof (params as unknown as Promise<unknown>).then === 'function') {
      void (params as Promise<{ sessionId: string }>).then(({ sessionId: value }) => setSessionId(value));
    }
  }, [params, resolvedParams]);

  const activeId = resolvedParams?.sessionId || sessionId;

  if (!activeId) return <p role="status" className="p-6 text-sm text-muted-foreground">Opening your Guided Coaching Room...</p>;

  return <CoachingRoom sessionId={activeId} />;
}
