import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execFileAsync = promisify(execFile);

// Use the system python or custom path
const PYTHON = process.env.PYTHON_PATH || 'python';

export async function POST(req: NextRequest) {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pptx-'));

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadPath = path.join(tmpDir, file.name);
    await fs.promises.writeFile(uploadPath, buffer);

    let text = '';
    let slideImages: string[] = [];

    if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
      // Convert PPTX → PDF via LibreOffice
      try {
        await execFileAsync('soffice', [
          '--headless', '--convert-to', 'pdf', '--outdir', tmpDir, uploadPath,
        ], { timeout: 60000 });
      } catch (e) {
        console.error('LibreOffice conversion error:', e);
        return NextResponse.json(
          { error: 'Failed to convert PowerPoint. Please ensure LibreOffice is installed and in PATH.' },
          { status: 500 }
        );
      }

      const files = await fs.promises.readdir(tmpDir);
      const pdfFile = files.find(f => f.endsWith('.pdf'));
      if (!pdfFile) {
        return NextResponse.json({ error: 'Failed to convert PowerPoint to PDF' }, { status: 500 });
      }
      const result = await processPDF(path.join(tmpDir, pdfFile), tmpDir);
      text = result.text;
      slideImages = result.images;
    } else if (fileName.endsWith('.pdf')) {
      const result = await processPDF(uploadPath, tmpDir);
      text = result.text;
      slideImages = result.images;
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Save slide images to public directory
    const slideId = `s-${Date.now()}`;
    const slideDir = path.join(process.cwd(), 'slides', slideId);
    await fs.promises.mkdir(slideDir, { recursive: true });

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
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process file: ' + (error instanceof Error ? error.message : 'Unknown') },
      { status: 500 }
    );
  } finally {
    try { await fs.promises.rm(tmpDir, { recursive: true }); } catch { /* ok */ }
  }
}

async function processPDF(pdfPath: string, tmpDir: string): Promise<{ text: string; images: string[] }> {
  let text = '';
  let images: string[] = [];

  // Extract text using pdfplumber
  const safePath = pdfPath.replace(/\\/g, '\\\\');
  try {
    const { stdout } = await execFileAsync(PYTHON, [
      '-c',
      `import pdfplumber
pdf = pdfplumber.open("${safePath}")
for p in pdf.pages:
    t = p.extract_text() or ""
    print(t)
pdf.close()`,
    ], { timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
    text = stdout;
  } catch (e) {
    console.error('Text extraction error:', e);
  }

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
max_pages = min(len(pdf), 30)  # cap at 30 slides
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
    console.error('Slide rendering error:', e);
  }

  return { text, images };
}
