import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest) {
  try {
    const sessions = await db.session.findMany({
      orderBy: { createdAt: 'desc' },
      include: { scores: true },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
