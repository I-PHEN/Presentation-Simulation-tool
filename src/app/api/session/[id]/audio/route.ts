import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';
import fs from 'fs';
import path from 'path';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const identity = await authenticateRequest(req);
    if (isAuthenticationFailure(identity)) return identity;

    const owned = await db.session.findFirst({ where: { id, userId: identity.userId }, select: { id: true } });
    if (!owned) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Define storage path
    const uploadDir = path.join(process.cwd(), 'public', 'recordings');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${id}.webm`;
    const filePath = path.join(uploadDir, filename);

    // Save audio file
    fs.writeFileSync(filePath, buffer);

    const audioPath = `/recordings/${filename}`;

    // Update session record in DB
    await db.session.update({
      where: { id },
      data: { audioPath },
    });

    return NextResponse.json({ success: true, audioPath });
  } catch (error) {
    console.error('Error saving session audio:', error);
    return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 });
  }
}
