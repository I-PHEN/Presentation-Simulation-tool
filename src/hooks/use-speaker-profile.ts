'use client';

import { useCallback, useEffect, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { emptyProfile, type SpeakerProfileData } from '@/features/coaching/speaker-profile';

export async function loadSpeakerProfile(fetcher: typeof authenticatedFetch = authenticatedFetch): Promise<SpeakerProfileData> {
  const response = await fetcher('/api/profile');
  if (!response.ok) throw new Error('Unable to load your profile.');
  const body = await response.json() as { profile?: SpeakerProfileData };
  return body.profile ?? emptyProfile;
}

export function useSpeakerProfile() {
  const [profile, setProfile] = useState<SpeakerProfileData>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(undefined);
    loadSpeakerProfile()
      .then((loaded) => { if (active) setProfile(loaded); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load your profile.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((v) => v + 1), []);
  return { profile, loading, error, retry };
}
