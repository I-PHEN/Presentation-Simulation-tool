import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';
import { normalizeInterests } from '@/features/onboarding/interests';

type MePayload = { interests: string[]; onboardedAt: string | null };

function readInterests(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    return normalizeInterests(JSON.parse(value));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const identity = await authenticateRequest(req);
  if (isAuthenticationFailure(identity)) return identity;
  try {
    const user = await db.user.upsert({ where: { id: identity.userId }, update: {}, create: { id: identity.userId } });
    const payload: MePayload = {
      interests: readInterests(user.interests),
      onboardedAt: user.onboardedAt ? user.onboardedAt.toISOString() : null,
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to load account:', error);
    return NextResponse.json({ interests: [], onboardedAt: new Date().toISOString() });
  }
}

export async function PUT(req: NextRequest) {
  const identity = await authenticateRequest(req);
  if (isAuthenticationFailure(identity)) return identity;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid account update' }, { status: 400 });
  }
  const { interests, onboarded } = (body ?? {}) as { interests?: unknown; onboarded?: unknown };
  try {
    await db.user.upsert({ where: { id: identity.userId }, update: {}, create: { id: identity.userId } });
    const existing = await db.user.findUnique({ where: { id: identity.userId }, select: { onboardedAt: true } });
    const normalized = interests === undefined ? undefined : normalizeInterests(interests);
    // Stamp onboardedAt only the first time, so repeated saves stay idempotent.
    const shouldStamp = onboarded === true && !existing?.onboardedAt;
    const user = await db.user.update({
      where: { id: identity.userId },
      data: {
        ...(normalized !== undefined ? { interests: JSON.stringify(normalized) } : {}),
        ...(shouldStamp ? { onboardedAt: new Date() } : {}),
      },
      select: { interests: true, onboardedAt: true },
    });
    const payload: MePayload = {
      interests: readInterests(user.interests),
      onboardedAt: user.onboardedAt ? user.onboardedAt.toISOString() : null,
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to update account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}
