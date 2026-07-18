import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; slide: string }> }
) {
  try {
    const identity = await authenticateRequest(req);
    if (isAuthenticationFailure(identity)) return identity;
    const { sessionId, slide } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(sessionId) || !/^slide-\d+\.(?:png|jpe?g)$/i.test(slide)) return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    const filePath = path.join(process.cwd(), 'slides', sessionId, slide);
    const metadataPath = path.join(process.cwd(), 'slides', sessionId, '.owner.json');
    let ownerId: string | undefined;
    try { ownerId = (JSON.parse(await fs.promises.readFile(metadataPath, 'utf8')) as { ownerId?: string }).ownerId; } catch { return NextResponse.json({ error: 'Slide not found' }, { status: 404 }); }
    if (ownerId !== identity.userId) return NextResponse.json({ error: 'Slide not found' }, { status: 404 });

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    const buffer = await fs.promises.readFile(filePath);
    const ext = path.extname(slide).toLowerCase();
    const contentType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // immutable: browser caches forever (slide content never changes)
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load slide' }, { status: 500 });
  }
}
