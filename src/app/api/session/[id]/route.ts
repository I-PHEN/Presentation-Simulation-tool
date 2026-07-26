import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateDefenseSessionSchema } from '@/features/defense/session-schema';
import { defenseDeckSchema, examinerEventsSchema, transcriptSegmentsSchema } from '@/features/defense/session-schema';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function parseArray(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parsePersisted(value: string): unknown | undefined {
  try { return JSON.parse(value); } catch { return undefined; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const identity = await authenticateRequest(req);
    if (isAuthenticationFailure(identity)) return identity;
    const { id } = await params;

    const session = await db.session.findFirst({
      where: { id, userId: identity.userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        scores: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.practiceMode === 'defense') {
      const deck = defenseDeckSchema.safeParse(parsePersisted(session.deckContext));
      const segments = transcriptSegmentsSchema.safeParse(parsePersisted(session.transcriptSegments));
      const events = examinerEventsSchema.safeParse(parsePersisted(session.examinerEvents));
      if (!deck.success || !segments.success || !events.success) return NextResponse.json({ error: 'Saved defense evidence is invalid. Please retry or create a new rehearsal.' }, { status: 422 });
      return NextResponse.json({
        defense: {
          ...session,
          deck: deck.data,
          transcriptSegments: segments.data,
          examinerEvents: events.data,
          findings: parseArray(session.findings),
        },
      });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const identity = await authenticateRequest(req);
    if (isAuthenticationFailure(identity)) return identity;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid defense session update' },
        { status: 400 },
      );
    }

    const update = updateDefenseSessionSchema.safeParse(body);
    if (!update.success) {
      return NextResponse.json(
        { error: 'Invalid defense session update', details: update.error.flatten() },
        { status: 400 },
      );
    }

    const { id } = await params;
    const requiresDefenseSession = update.data.transcriptSegments !== undefined
      || update.data.examinerEvents !== undefined
      || update.data.deliverySamples !== undefined
      || update.data.status !== undefined;
    if (requiresDefenseSession) {
      const target = await db.session.findFirst({ where: { id, userId: identity.userId }, select: { practiceMode: true } });
      if (!target || target.practiceMode !== 'defense') {
        return NextResponse.json({ error: 'Defense rehearsal updates require a defense session' }, { status: 400 });
      }
    }
    const { transcriptSegments, examinerEvents, deliverySamples, ...scalarUpdate } = update.data;
    const owned = await db.session.findFirst({ where: { id, userId: identity.userId }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    const session = await db.session.update({
      where: { id },
      data: {
        ...scalarUpdate,
        ...(transcriptSegments ? { transcriptSegments: JSON.stringify(transcriptSegments) } : {}),
        ...(examinerEvents ? { examinerEvents: JSON.stringify(examinerEvents) } : {}),
        ...(deliverySamples ? { deliverySamples: JSON.stringify(deliverySamples) } : {}),
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const identity = await authenticateRequest(req);
    if (isAuthenticationFailure(identity)) return identity;
    const { id } = await params;
    const owned = await db.session.findFirst({ where: { id, userId: identity.userId }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    await db.session.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
