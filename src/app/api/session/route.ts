import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, audienceType, content } = body as {
      title: string;
      audienceType: string;
      content: string;
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
        audienceType: mappedAudienceType,
        content: content || '',
        summary: '',
        keyPoints: '[]',
        questions: '{}',
        status: 'upload',
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
