import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; slide: string }> }
) {
  try {
    const { sessionId, slide } = await params;
    const filePath = path.join(process.cwd(), 'slides', sessionId, slide);

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
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load slide' }, { status: 500 });
  }
}
