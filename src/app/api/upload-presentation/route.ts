import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { validateDeckUpload } from '@/features/defense/upload';
import {
  buildPowerPointArguments,
  isRetryablePowerPointConversionFailure,
  selectPowerPointConverter,
} from '@/features/defense/deck-conversion';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';

const execFileAsync = promisify(execFile);

// Use the system python or custom path
const PYTHON = process.env.PYTHON_PATH || 'python';
const POWERPOINT_PATH = 'C:\\Program Files\\Microsoft Office\\root\\Office16\\POWERPNT.EXE';

async function commandPath(command: string): Promise<string | null> {
  const lookup = process.platform === 'win32' ? 'where.exe' : 'which';

  try {
    const { stdout } = await execFileAsync(lookup, [command], { timeout: 5_000 });
    return stdout.split(/\r?\n/).map((value) => value.trim()).find(Boolean) ?? null;
  } catch {
    return null;
  }
}

async function convertPowerPoint(uploadPath: string, tmpDir: string): Promise<string | null> {
  const sofficePath = await commandPath('soffice');
  const powerPointPath = process.platform === 'win32' && fs.existsSync(POWERPOINT_PATH)
    ? POWERPOINT_PATH
    : null;
  const converter = selectPowerPointConverter({
    platform: process.platform,
    sofficePath,
    powerPointPath,
  });

  if (!converter) {
    return null;
  }

  if (converter === 'libreoffice') {
    const { stdout, stderr } = await execFileAsync(sofficePath!, [
      '--headless', '--convert-to', 'pdf', '--outdir', tmpDir, uploadPath,
    ], { timeout: 60_000 });

    const pdfFile = (await fs.promises.readdir(tmpDir)).find((file) => file.toLowerCase().endsWith('.pdf'));
    if (pdfFile) {
      return path.join(tmpDir, pdfFile);
    }

    throw Object.assign(new Error('LibreOffice did not produce a PDF.'), { stdout, stderr });
  }

  const outputPath = path.join(tmpDir, 'converted.pdf');
  await execFileAsync('powershell.exe', buildPowerPointArguments(uploadPath, outputPath), {
    timeout: 60_000,
  });
  return fs.existsSync(outputPath) ? outputPath : null;
}

export async function POST(req: NextRequest) {
  const identity = await authenticateRequest(req);
  if (isAuthenticationFailure(identity)) return identity;
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pptx-'));

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided', retryable: false }, { status: 400 });
    }

    const validation = validateDeckUpload(file);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, retryable: false }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadPath = path.join(tmpDir, path.basename(file.name));
    await fs.promises.writeFile(uploadPath, buffer);

    let text = '';
    let slideImages: string[] = [];
    let slideTexts: string[] = [];

    if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
      try {
        const pdfPath = await convertPowerPoint(uploadPath, tmpDir);
        if (!pdfPath) {
          return NextResponse.json(
            { error: 'PowerPoint conversion is temporarily unavailable.', retryable: true },
            { status: 503 },
          );
        }

        const result = await processPDF(pdfPath, tmpDir);
        text = result.text;
        slideImages = result.images;
        slideTexts = result.slideTexts;
      } catch (e) {
        console.error('PowerPoint conversion error:', e);
        const retryable = isRetryablePowerPointConversionFailure(e);
        return NextResponse.json(
          {
            error: retryable
              ? 'PowerPoint conversion is temporarily unavailable.'
              : 'This PowerPoint file is invalid or corrupt.',
            retryable,
          },
          { status: retryable ? 503 : 422 },
        );
      }
    } else if (fileName.endsWith('.pdf')) {
      const result = await processPDF(uploadPath, tmpDir);
      text = result.text;
      slideImages = result.images;
      slideTexts = result.slideTexts;
    } else {
      return NextResponse.json({ error: 'Unsupported file type', retryable: false }, { status: 400 });
    }

    if (slideImages.length === 0) {
      return NextResponse.json(
        { error: 'No pages could be rendered from this deck.', retryable: false },
        { status: 422 },
      );
    }

    // Slide assets are private to the authenticated uploader. The random ID is
    // intentionally not an authorization mechanism; the metadata check is.
    const slideId = randomUUID();
    const slideDir = path.join(process.cwd(), 'slides', slideId);
    await fs.promises.mkdir(slideDir, { recursive: true });
    await fs.promises.writeFile(path.join(slideDir, '.owner.json'), JSON.stringify({ ownerId: identity.userId }));

    const slideUrls: string[] = [];
    for (let i = 0; i < slideImages.length; i++) {
      // Detect format from base64 header
      const isJpeg = slideImages[i].startsWith('/9j/');
      const imgName = isJpeg ? `slide-${i + 1}.jpg` : `slide-${i + 1}.png`;
      await fs.promises.writeFile(
        path.join(slideDir, imgName),
        Buffer.from(slideImages[i], 'base64')
      );
      slideUrls.push(`/api/slides/${slideId}/${imgName}`);
    }

    return NextResponse.json({
      text: text.trim(),
      slides: slideUrls,
      totalSlides: slideUrls.length,
      deck: {
        sourceName: file.name,
        slides: slideUrls.map((imageUrl, index) => ({
          index: index + 1,
          imageUrl,
          text: slideTexts[index] || '',
        })),
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    if ((error as { code?: string }).code === 'DECK_TOO_LARGE') {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Deck exceeds the 30-slide limit.', retryable: false }, { status: 413 });
    }
    return NextResponse.json(
      {
        error: 'Failed to process file: ' + (error instanceof Error ? error.message : 'Unknown'),
        retryable: true,
      },
      { status: 500 }
    );
  } finally {
    try { await fs.promises.rm(tmpDir, { recursive: true }); } catch { /* ok */ }
  }
}

async function processPDF(pdfPath: string, tmpDir: string): Promise<{ text: string; images: string[]; slideTexts: string[] }> {
  let text = '';
  let images: string[] = [];
  let slideTexts: string[] = [];

  // Extract text using pdfplumber
  try {
    const { stdout } = await execFileAsync(PYTHON, [
      '-c',
      `import sys
import io
import json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import pdfplumber
pdf = pdfplumber.open(sys.argv[1])
pages = []
for p in pdf.pages:
    pages.append(p.extract_text() or "")
print(json.dumps(pages))
pdf.close()`,
      pdfPath,
    ], { timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
    slideTexts = JSON.parse(stdout) as string[];
    text = slideTexts.join('\n\n');
  } catch (e) {
    console.error('Text extraction error:', e);
  }

  const maxSlides = 30;
  if (slideTexts.length > maxSlides) throw Object.assign(new Error(`Deck has ${slideTexts.length} slides; the maximum supported length is ${maxSlides}.`), { code: 'DECK_TOO_LARGE' });
  // Render pages as images using pypdfium2
  const imgDir = path.join(tmpDir, 'slides');
  await fs.promises.mkdir(imgDir, { recursive: true });

  const script = `
import pypdfium2 as pdfium
import sys
from PIL import Image
import io
import os

pdf = pdfium.PdfDocument(sys.argv[1])
max_pages = len(pdf)
for i in range(max_pages):
    page = pdf[i]
    bitmap = page.render(scale=1.5)  # 1.5x is plenty for display
    pil_image = bitmap.to_pil()
    # Save as JPEG (quality 82) to keep file sizes small
    out_path = os.path.join(sys.argv[2], f"s-{i}.jpg")
    pil_image.convert("RGB").save(out_path, "JPEG", quality=82, optimize=True)
pdf.close()
`;

  try {
    const scriptPath = path.join(tmpDir, 'render.py');
    await fs.promises.writeFile(scriptPath, script);
    await execFileAsync(PYTHON, [scriptPath, pdfPath, imgDir], { timeout: 60000 });

    const files = (await fs.promises.readdir(imgDir))
      .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
      .sort((a, b) => {
        const na = parseInt(a.match(/s-(\d+)/)?.[1] || '0');
        const nb = parseInt(b.match(/s-(\d+)/)?.[1] || '0');
        return na - nb;
      });

    for (const f of files) {
      const imgBuf = await fs.promises.readFile(path.join(imgDir, f));
      images.push(imgBuf.toString('base64'));
    }
  } catch (e) {
    if ((e as { code?: string }).code === 'DECK_TOO_LARGE') throw e;
    console.error('Slide rendering error:', e);
  }

  return { text, images, slideTexts };
}
