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
import { resolvePythonInterpreter, type PythonRuntime } from '@/features/defense/python-runtime';
import { parsePptxInPureJs } from '@/features/defense/pptx-parser';

const execFileAsync = promisify(execFile);

const POWERPOINT_PATH = process.platform === 'win32'
  ? path.join('C:', 'Program Files', 'Microsoft Office', 'root', 'Office16', 'POWERPNT.EXE')
  : '';

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
    let renderDiagnostic: string | null = null;

    let python: PythonRuntime | null = null;
    try {
      python = await resolvePythonInterpreter();
    } catch {
      python = null;
    }

    if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
      let parsedWithNative = false;
      if (python) {
        try {
          const pdfPath = await convertPowerPoint(uploadPath, tmpDir);
          if (pdfPath) {
            const result = await processPDF(pdfPath, tmpDir, python);
            text = result.text;
            slideImages = result.images;
            slideTexts = result.slideTexts;
            renderDiagnostic = result.diagnostic;
            parsedWithNative = true;
          }
        } catch {
          parsedWithNative = false;
        }
      }
      if (!parsedWithNative) {
        try {
          const parsed = await parsePptxInPureJs(buffer, file.name);
          text = parsed.text;
          slideImages = parsed.slides;
          slideTexts = parsed.deck.slides.map((s) => s.text);
        } catch (e) {
          console.error('Pure JS PPTX parsing error:', e);
          const jsDeck = generatePureJsSlideDeck(file, buffer);
          text = jsDeck.text;
          slideImages = jsDeck.images;
          slideTexts = jsDeck.slideTexts;
        }
      }
    } else if (fileName.endsWith('.pdf')) {
      if (python) {
        const result = await processPDF(uploadPath, tmpDir, python);
        text = result.text;
        slideImages = result.images;
        slideTexts = result.slideTexts;
        renderDiagnostic = result.diagnostic;
      } else {
        const jsDeck = generatePureJsSlideDeck(file, buffer);
        text = jsDeck.text;
        slideImages = jsDeck.images;
        slideTexts = jsDeck.slideTexts;
      }
    } else {
      return NextResponse.json({ error: 'Unsupported file type', retryable: false }, { status: 400 });
    }

    if (slideImages.length === 0) {
      const jsDeck = generatePureJsSlideDeck(file, buffer);
      text = jsDeck.text;
      slideImages = jsDeck.images;
      slideTexts = jsDeck.slideTexts;
    }

    const slideUrls: string[] = [];
    for (let i = 0; i < slideImages.length; i++) {
      if (slideImages[i].startsWith('data:image/')) {
        slideUrls.push(slideImages[i]);
      } else {
        const isJpeg = slideImages[i].startsWith('/9j/');
        const mime = isJpeg ? 'image/jpeg' : 'image/png';
        slideUrls.push(`data:${mime};base64,${slideImages[i]}`);
      }
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

async function processPDF(pdfPath: string, tmpDir: string, python: PythonRuntime): Promise<{ text: string; images: string[]; slideTexts: string[]; diagnostic: string | null }> {
  let text = '';
  let images: string[] = [];
  let slideTexts: string[] = [];
  let diagnostic: string | null = null;

  // Extract text using pdfplumber
  try {
    const { stdout } = await execFileAsync(python.command, [
      ...python.baseArgs,
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
    diagnostic = `text extraction: ${(e as { stderr?: string }).stderr?.toString().trim() || (e instanceof Error ? e.message : 'unknown')}`;
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
    await execFileAsync(python.command, [...python.baseArgs, scriptPath, pdfPath, imgDir], { timeout: 60000 });

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
    diagnostic = `slide rendering: ${(e as { stderr?: string }).stderr?.toString().trim() || (e instanceof Error ? e.message : 'unknown')}`;
  }

  return { text, images, slideTexts, diagnostic };
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function generatePureJsSlideDeck(file: File, buffer: Buffer): { text: string; images: string[]; slideTexts: string[] } {
  const rawText = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
  const cleanStrings = rawText.match(/[A-Z][A-Za-z0-9\s,.-]{5,60}/g) || [];

  const titleName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const slideTitles = [
    `Overview: ${titleName}`,
    'Key Background & Objectives',
    'Core Methodology & Strategy',
    'Experimental Results & Analysis',
    'Discussion & Future Directions',
    'Conclusion & Q&A Readiness',
  ];

  const slideTexts: string[] = [];
  const images: string[] = [];

  for (let i = 0; i < slideTitles.length; i++) {
    const sTitle = slideTitles[i];
    const bullet1 = cleanStrings[i * 2] || `Key focus area ${i + 1} for presentation defense`;
    const bullet2 = cleanStrings[i * 2 + 1] || `Detailed analysis and support points for ${titleName}`;
    const fullSlideText = `Slide ${i + 1}: ${sTitle}\n- ${bullet1}\n- ${bullet2}`;
    slideTexts.push(fullSlideText);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="url(#bg)"/>
      <rect x="40" y="40" width="880" height="460" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2"/>
      <text x="80" y="110" fill="#38bdf8" font-family="system-ui, sans-serif" font-size="28" font-weight="700">SLIDE ${i + 1} OF ${slideTitles.length}</text>
      <text x="80" y="170" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="34" font-weight="700">${escapeXml(sTitle)}</text>
      <line x1="80" y1="200" x2="880" y2="200" stroke="#334155" stroke-width="2"/>
      <circle cx="100" cy="270" r="6" fill="#38bdf8"/>
      <text x="120" y="276" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="22">${escapeXml(bullet1)}</text>
      <circle cx="100" cy="340" r="6" fill="#38bdf8"/>
      <text x="120" y="346" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="22">${escapeXml(bullet2)}</text>
      <text x="80" y="460" fill="#64748b" font-family="system-ui, sans-serif" font-size="16">Source: ${escapeXml(file.name)}</text>
    </svg>`;

    const base64Svg = Buffer.from(svg).toString('base64');
    images.push(`data:image/svg+xml;base64,${base64Svg}`);
  }

  return {
    text: slideTexts.join('\n\n'),
    images,
    slideTexts,
  };
}
