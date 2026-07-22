import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createDefenseSessionSchema } from '@/features/defense/session-schema';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  try {
    const identity = await authenticateRequest(req);
    if (isAuthenticationFailure(identity)) return identity;
    // Session.userId is a foreign key to User; ensure the owner row exists before
    // inserting a session, or the create violates the constraint (500).
    await db.user.upsert({ where: { id: identity.userId }, update: {}, create: { id: identity.userId } });
    const body = await req.json();

    if (body.mode && body.deck) {
      const defense = createDefenseSessionSchema.safeParse(body);
      if (!defense.success) {
        return NextResponse.json(
          { error: 'Invalid defense session', details: defense.error.flatten() },
          { status: 400 },
        );
      }

      const session = await db.session.create({
        data: {
          title: defense.data.title,
          userId: identity.userId,
          audienceType: 'professor',
          practiceMode: 'defense',
          mode: defense.data.mode,
          stance: defense.data.stance,
          content: defense.data.deck.slides.map((slide) => slide.text).join('\n\n'),
          deckContext: JSON.stringify(defense.data.deck),
          transcriptSegments: '[]',
          examinerEvents: '[]',
          status: 'upload',
        },
      });

      return NextResponse.json({ sessionId: session.id });
    }

    const { title, audienceType, content, practiceMode, customConfig } = body as {
      title: string;
      audienceType: string;
      content: string;
      practiceMode?: string;
      customConfig?: string;
    };

    if (!audienceType) {
      return NextResponse.json(
        { error: 'audienceType is required' },
        { status: 400 }
      );
    }

    // Map frontend audience types to internal types
    const audienceTypeMap: Record<string, string> = {
      hackathon: 'hackathon_judge',
      investor: 'investor',
      professor: 'professor',
      customer: 'customer',
      executive: 'executive',
    };

    const mappedAudienceType = audienceTypeMap[audienceType] || audienceType;

    // Create a new session with the content as context
    const session = await db.session.create({
      data: {
        title: title || 'Untitled Presentation',
        userId: identity.userId,
        audienceType: mappedAudienceType,
        practiceMode: practiceMode || 'full',
        content: content || '',
        summary: '',
        keyPoints: '[]',
        questions: '{}',
        status: 'upload',
        customConfig: customConfig || null,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
