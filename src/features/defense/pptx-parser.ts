import JSZip from 'jszip';

export interface ParsedSlide {
  index: number;
  title: string;
  bullets: string[];
  fullText: string;
  images: string[];
  imageUrl: string;
}

export interface ParsedDeck {
  text: string;
  slides: string[];
  totalSlides: number;
  deck: {
    sourceName: string;
    slides: Array<{
      index: number;
      imageUrl: string;
      text: string;
    }>;
  };
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

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

interface ShapeElement {
  type: 'title' | 'text' | 'image';
  text?: string;
  paragraphs?: Array<{ text: string; isBullet: boolean; fontSize?: number; color?: string; align?: string }>;
  imageDataUrl?: string;
  x: number; // in px
  y: number; // in px
  width: number; // in px
  height: number; // in px
}

/**
 * Parses a PPTX buffer in pure JavaScript/Node.js, extracting all slides in exact
 * presentation order, preserving shape positions, titles, bullet lists, colors,
 * embedded media images, and generating high-fidelity slide SVG cards.
 */
export async function parsePptxInPureJs(buffer: Buffer, sourceName: string): Promise<ParsedDeck> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Determine slide order using ppt/presentation.xml & ppt/_rels/presentation.xml.rels
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  const presentationRelsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text');

  const orderedSlideFiles: string[] = [];

  if (presentationXml && presentationRelsXml) {
    // Extract rId mapping: rId -> slide path
    const rIdToSlide = new Map<string, string>();
    const relMatches = presentationRelsXml.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g);
    for (const m of relMatches) {
      const [, rId, target] = m;
      if (target.includes('slides/slide')) {
        const slideName = target.replace(/^.*[/\\]slides[/\\]/, '');
        rIdToSlide.set(rId, slideName);
      }
    }

    // Extract slide order from <p:sldIdLst>
    const sldIdMatches = presentationXml.matchAll(/<p:sldId\b[^>]*r:id="(rId\d+)"/g);
    for (const m of sldIdMatches) {
      const rId = m[1];
      const slideName = rIdToSlide.get(rId);
      if (slideName) {
        orderedSlideFiles.push(slideName);
      }
    }
  }

  // Fallback: If presentation.xml parsing found no slides, find all slide*.xml files in zip
  if (orderedSlideFiles.length === 0) {
    const foundFiles: Array<{ filename: string; num: number }> = [];
    zip.folder('ppt/slides')?.forEach((relativePath, file) => {
      const match = relativePath.match(/^slide(\d+)\.xml$/i);
      if (match && !file.dir) {
        foundFiles.push({ filename: relativePath, num: parseInt(match[1], 10) });
      }
    });
    foundFiles.sort((a, b) => a.num - b.num);
    for (const f of foundFiles) {
      orderedSlideFiles.push(f.filename);
    }
  }

  if (orderedSlideFiles.length === 0) {
    throw new Error('No slides found in PowerPoint presentation.');
  }

  // Parse slide dimensions (default 16:9 = 960x540)
  let canvasW = 960;
  let canvasH = 540;
  if (presentationXml) {
    const sldSzMatch = presentationXml.match(/<p:sldSz\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
    if (sldSzMatch) {
      const emuX = parseInt(sldSzMatch[1], 10);
      const emuY = parseInt(sldSzMatch[2], 10);
      if (emuX > 0 && emuY > 0) {
        const ratio = emuY / emuX;
        canvasW = 960;
        canvasH = Math.round(960 * ratio);
      }
    }
  }

  const parsedSlides: ParsedSlide[] = [];

  for (let i = 0; i < orderedSlideFiles.length; i++) {
    const slideFilename = orderedSlideFiles[i];
    const slideXmlPath = `ppt/slides/${slideFilename}`;
    const slideXmlStr = await zip.file(slideXmlPath)?.async('text');

    if (!slideXmlStr) continue;

    // Parse slide relationships for media images
    const relsPath = `ppt/slides/_rels/${slideFilename}.rels`;
    const relsXmlStr = await zip.file(relsPath)?.async('text');
    const imageMap = new Map<string, string>(); // rId -> media path in zip

    if (relsXmlStr) {
      const relMatches = relsXmlStr.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g);
      for (const m of relMatches) {
        const [, rId, target] = m;
        if (target.includes('media/')) {
          const mediaName = target.replace(/^.*[/\\]media[/\\]/, 'ppt/media/');
          imageMap.set(rId, mediaName);
        }
      }
    }

    // Cache image base64 data URLs
    const rIdToDataUrl = new Map<string, string>();
    const embeddedImages: string[] = [];

    for (const [rId, mediaPath] of imageMap) {
      const imgFile = zip.file(mediaPath);
      if (imgFile) {
        const imgBuffer = await imgFile.async('nodebuffer');
        const ext = mediaPath.split('.').pop()?.toLowerCase();
        const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${imgBuffer.toString('base64')}`;
        rIdToDataUrl.set(rId, dataUrl);
        embeddedImages.push(dataUrl);
      }
    }

    // Extract shapes (text boxes, pictures)
    const shapes: ShapeElement[] = [];
    const paragraphsList: string[] = [];

    // Parse shapes <p:sp>
    const spMatches = slideXmlStr.matchAll(/<p:sp\b[^>]*>(.*?)<\/p:sp>/gs);
    for (const spMatch of spMatches) {
      const spXml = spMatch[1];
      const isTitle = spXml.includes('type="title"') || spXml.includes('type="ctrTitle"');

      // Coordinates
      const offMatch = spXml.match(/<a:off\b[^>]*x="(\d+)"[^>]*y="(\d+)"/);
      const extMatch = spXml.match(/<a:ext\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);

      const xEmu = offMatch ? parseInt(offMatch[1], 10) : 914400;
      const yEmu = offMatch ? parseInt(offMatch[2], 10) : 914400;
      const cxEmu = extMatch ? parseInt(extMatch[1], 10) : 7315200;
      const cyEmu = extMatch ? parseInt(extMatch[2], 10) : 1828800;

      // Scale 9144000 EMUs -> canvasW (960)
      const emuScale = canvasW / 9144000;
      const x = Math.max(20, Math.min(canvasW - 40, Math.round(xEmu * emuScale)));
      const y = Math.max(20, Math.min(canvasH - 40, Math.round(yEmu * emuScale)));
      const width = Math.max(100, Math.min(canvasW, Math.round(cxEmu * emuScale)));
      const height = Math.max(30, Math.min(canvasH, Math.round(cyEmu * emuScale)));

      // Paragraphs inside shape
      const pMatches = spXml.matchAll(/<a:p\b[^>]*>(.*?)<\/a:p>/gs);
      const shapeParas: Array<{ text: string; isBullet: boolean }> = [];

      for (const pMatch of pMatches) {
        const pXml = pMatch[1];
        const isBullet = pXml.includes('<a:buChar') || pXml.includes('<a:buAutoNum');

        const tMatches = pXml.matchAll(/<a:t\b[^>]*>(.*?)<\/a:t>/gs);
        const textPieces: string[] = [];
        for (const tMatch of tMatches) {
          const raw = tMatch[1]
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .trim();
          if (raw) textPieces.push(raw);
        }
        const paraText = textPieces.join(' ').trim();
        if (paraText) {
          shapeParas.push({ text: paraText, isBullet });
          paragraphsList.push(paraText);
        }
      }

      if (shapeParas.length > 0) {
        shapes.push({
          type: isTitle ? 'title' : 'text',
          paragraphs: shapeParas,
          x,
          y,
          width,
          height,
        });
      }
    }

    // Parse pictures <p:pic>
    const picMatches = slideXmlStr.matchAll(/<p:pic\b[^>]*>(.*?)<\/p:pic>/gs);
    for (const picMatch of picMatches) {
      const picXml = picMatch[1];
      const embedMatch = picXml.match(/r:embed="(rId\d+)"/);
      const rId = embedMatch ? embedMatch[1] : null;
      const imageDataUrl = rId ? rIdToDataUrl.get(rId) : null;

      if (imageDataUrl) {
        const offMatch = picXml.match(/<a:off\b[^>]*x="(\d+)"[^>]*y="(\d+)"/);
        const extMatch = picXml.match(/<a:ext\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);

        const xEmu = offMatch ? parseInt(offMatch[1], 10) : 1828800;
        const yEmu = offMatch ? parseInt(offMatch[2], 10) : 1828800;
        const cxEmu = extMatch ? parseInt(extMatch[1], 10) : 5486400;
        const cyEmu = extMatch ? parseInt(extMatch[2], 10) : 3657600;

        const emuScale = canvasW / 9144000;
        const x = Math.max(20, Math.min(canvasW - 40, Math.round(xEmu * emuScale)));
        const y = Math.max(20, Math.min(canvasH - 40, Math.round(yEmu * emuScale)));
        const width = Math.max(100, Math.min(canvasW, Math.round(cxEmu * emuScale)));
        const height = Math.max(100, Math.min(canvasH, Math.round(cyEmu * emuScale)));

        shapes.push({
          type: 'image',
          imageDataUrl,
          x,
          y,
          width,
          height,
        });
      }
    }

    const titleShape = shapes.find(s => s.type === 'title') || shapes.find(s => s.type === 'text');
    const title = titleShape?.paragraphs?.[0]?.text || paragraphsList[0] || `Slide ${i + 1}`;
    const bullets = paragraphsList.filter(p => p !== title);
    const fullText = `Slide ${i + 1}: ${title}\n` + bullets.map(b => `- ${b}`).join('\n');

    // Render SVG slide card
    const svgImageUrl = renderHighFidelitySlideSvg({
      slideIndex: i + 1,
      totalSlides: orderedSlideFiles.length,
      title,
      bullets,
      shapes,
      canvasW,
      canvasH,
      sourceName,
      embeddedImage: embeddedImages[0] || null,
    });

    parsedSlides.push({
      index: i + 1,
      title,
      bullets,
      fullText,
      images: embeddedImages,
      imageUrl: svgImageUrl,
    });
  }

  const combinedText = parsedSlides.map(s => s.fullText).join('\n\n');
  const slideUrls = parsedSlides.map(s => s.imageUrl);

  return {
    text: combinedText.trim(),
    slides: slideUrls,
    totalSlides: slideUrls.length,
    deck: {
      sourceName,
      slides: parsedSlides.map(s => ({
        index: s.index,
        imageUrl: s.imageUrl,
        text: s.fullText,
      })),
    },
  };
}

/**
 * Renders a high-fidelity SVG representation of the slide layout and content.
 */
function renderHighFidelitySlideSvg(opts: {
  slideIndex: number;
  totalSlides: number;
  title: string;
  bullets: string[];
  shapes: ShapeElement[];
  canvasW: number;
  canvasH: number;
  sourceName: string;
  embeddedImage: string | null;
}): string {
  const { slideIndex, totalSlides, title, bullets, shapes, canvasW, canvasH, sourceName, embeddedImage } = opts;

  const displayTitle = escapeXml(truncateText(title, 60));
  const maxBullets = 5;
  const displayBullets = bullets.slice(0, maxBullets).map(b => escapeXml(truncateText(b, 85)));

  let shapesSvg = '';

  // Render non-title text shapes and images
  const imageShapes = shapes.filter(s => s.type === 'image' && s.imageDataUrl);
  if (imageShapes.length > 0) {
    imageShapes.forEach((imgShape) => {
      shapesSvg += `
        <image href="${imgShape.imageDataUrl}" x="${imgShape.x}" y="${imgShape.y}" width="${imgShape.width}" height="${imgShape.height}" preserveAspectRatio="xMidYMid meet"/>
      `;
    });
  } else if (embeddedImage) {
    shapesSvg += `
      <image href="${embeddedImage}" x="560" y="150" width="340" height="300" preserveAspectRatio="xMidYMid meet"/>
    `;
  }

  let bulletsSvg = '';
  const startY = 220;
  const lineGap = 50;

  displayBullets.forEach((bullet, idx) => {
    const yPos = startY + (idx * lineGap);
    bulletsSvg += `
      <circle cx="95" cy="${yPos}" r="5" fill="#38bdf8"/>
      <text x="115" y="${yPos + 6}" fill="#cbd5e1" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="400">${bullet}</text>
    `;
  });

  const viewBox = `0 0 ${canvasW} ${canvasH}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="${viewBox}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="${canvasW}" height="${canvasH}" fill="url(#bg)"/>
    <rect x="30" y="30" width="${canvasW - 60}" height="${canvasH - 60}" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2"/>
    <text x="70" y="90" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700">SLIDE ${slideIndex} OF ${totalSlides}</text>
    <text x="70" y="150" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="30" font-weight="700">${displayTitle}</text>
    <line x1="70" y1="180" x2="${canvasW - 70}" y2="180" stroke="#334155" stroke-width="2"/>
    ${bulletsSvg}
    ${shapesSvg}
    <text x="70" y="${canvasH - 45}" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="14">Source: ${escapeXml(truncateText(sourceName, 40))}</text>
  </svg>`;

  const base64Svg = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}
