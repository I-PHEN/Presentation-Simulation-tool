import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';
import { normalizeInterests } from '@/features/onboarding/interests';
import { DEFAULT_TOPICS, buildTopicsPrompt, parseTopicsResponse } from '@/features/onboarding/topics';
import { getZAI } from '@/lib/zai';

export async function POST(req: NextRequest) {
  const identity = await authenticateRequest(req);
  if (isAuthenticationFailure(identity)) return identity;
  try {
    const user = await db.user.findUnique({ where: { id: identity.userId }, select: { interests: true } });
    let interests: string[] = [];
    try {
      interests = normalizeInterests(user?.interests ? JSON.parse(user.interests) : []);
    } catch {
      interests = [];
    }

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'user', content: buildTopicsPrompt(interests) }],
      thinking: { type: 'disabled' },
    });
    const text = completion.choices[0]?.message?.content ?? '';
    const topics = parseTopicsResponse(text);
    return NextResponse.json({ topics: topics.length ? topics : [...DEFAULT_TOPICS] });
  } catch (error) {
    // Non-fatal: the UI must always have a usable set of topics to show.
    console.error('Topic recommendation failed (non-fatal):', error);
    return NextResponse.json({ topics: [...DEFAULT_TOPICS] });
  }
}
