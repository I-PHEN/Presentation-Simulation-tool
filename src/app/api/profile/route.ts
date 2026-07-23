import { NextResponse } from 'next/server';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';
import { getOrCreateProfile } from '@/features/coaching/speaker-profile-repository';

export async function GET(request: Request) {
  const identity = await authenticateRequest(request);
  if (isAuthenticationFailure(identity)) return identity;
  try {
    const profile = await getOrCreateProfile(identity.userId);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Failed to load speaker profile:', error);
    return NextResponse.json({ error: 'Failed to load your profile' }, { status: 500 });
  }
}
