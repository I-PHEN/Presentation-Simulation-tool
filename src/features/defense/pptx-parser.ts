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

interface ParagraphInfo {
  text: string;
  isBullet: boolean;
  fontSizePx?: number;
  colorHex?: string;
  align?: 'left' | 'center' | 'right';
  isBold?: boolean;
}

interface ShapeElement {
  type: 'title' | 'text' | 'image' | 'table';
  text?: string;
  paragraphs?: ParagraphInfo[];
  tableRows?: string[][];
  imageDataUrl?: string;
  x: number; // in px
  y: number; // in px
  width: number; // in px
  height: number; // in px
}

/**
 * Parses a PPTX buffer in pure JavaScript/Node.js, extracting all slides in exact
 * presentation order, preserving shape positions, titles, bullet lists, tables,
 * font sizes, colors, embedded media images, and generating high-fidelity slide SVG cards.
 */
export async function parsePptxInPureJs(buffer: Buffer, sourceName: string): Promise<ParsedDeck> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Determine slide order using ppt/presentation.xml & ppt/_rels/presentation.xml.rels
  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text');
  const presentationRelsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text');

  const orderedSlideFiles: string[] = [];

  if (presentationXml && presentationRelsXml) {
    const rIdToSlide = new Map<string, string>();
    const relTagMatches = presentationRelsXml.matchAll(/<Relationship\b[^>]*>/g);
    for (const m of relTagMatches) {
      const tag = m[0];
      const rIdMatch = tag.match(/Id="(rId\d+)"/);
      const targetMatch = tag.match(/Target="([^"]+)"/);
      if (rIdMatch && targetMatch) {
        const rId = rIdMatch[1];
        const target = targetMatch[1];
        if (target.includes('slide')) {
          const slideName = target.split(/[/\\]/).pop() || target;
          rIdToSlide.set(rId, slideName);
        }
      }
    }

    const sldIdMatches = presentationXml.matchAll(/<p:sldId\b[^>]*r:id="(rId\d+)"/g);
    for (const m of sldIdMatches) {
      const rId = m[1];
      const slideName = rIdToSlide.get(rId);
      if (slideName && !orderedSlideFiles.includes(slideName)) {
        orderedSlideFiles.push(slideName);
      }
    }
  }

  // Fallback: If presentation.xml didn't list files, discover all slide*.xml in zip
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
    const imageMap = new Map<string, string>();

    if (relsXmlStr) {
      const relMatches = relsXmlStr.matchAll(/<Relationship\b[^>]*>/g);
      for (const m of relMatches) {
        const tag = m[0];
        const rIdMatch = tag.match(/Id="(rId\d+)"/);
        const targetMatch = tag.match(/Target="([^"]+)"/);
        if (rIdMatch && targetMatch) {
          const rId = rIdMatch[1];
          const target = targetMatch[1];
          if (target.includes('media/')) {
            const mediaName = target.replace(/^.*[/\\]media[/\\]/, 'ppt/media/');
            imageMap.set(rId, mediaName);
          }
        }
      }
    }

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

    // Extract slide background color if present
    let bgColor = '#1e293b';
    const bgClrMatch = slideXmlStr.match(/<p:bg\b[^>]*>.*?<a:srgbClr\b[^>]*val="([A-Fa-f0-9]{6})"/s);
    if (bgClrMatch) {
      bgColor = `#${bgClrMatch[1]}`;
    }

    const shapes: ShapeElement[] = [];
    const paragraphsList: string[] = [];

    const emuScale = canvasW / 9144000;

    // Parse all shape elements (shapes, grouped shapes, pictures, tables)
    // 1. Shapes (<p:sp>)
    const spMatches = slideXmlStr.matchAll(/<p:sp\b[^>]*>(.*?)<\/p:sp>/gs);
    for (const spMatch of spMatches) {
      const spXml = spMatch[1];
      const isTitle = spXml.includes('type="title"') || spXml.includes('type="ctrTitle"');

      const offMatch = spXml.match(/<a:off\b[^>]*x="(\d+)"[^>]*y="(\d+)"/);
      const extMatch = spXml.match(/<a:ext\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);

      const xEmu = offMatch ? parseInt(offMatch[1], 10) : (isTitle ? 685800 : 914400);
      const yEmu = offMatch ? parseInt(offMatch[2], 10) : (isTitle ? 457200 : 1828800);
      const cxEmu = extMatch ? parseInt(extMatch[1], 10) : 7772400;
      const cyEmu = extMatch ? parseInt(extMatch[2], 10) : 1371600;

      const x = Math.max(10, Math.min(canvasW - 20, Math.round(xEmu * emuScale)));
      const y = Math.max(10, Math.min(canvasH - 20, Math.round(yEmu * emuScale)));
      const width = Math.max(50, Math.min(canvasW - 20, Math.round(cxEmu * emuScale)));
      const height = Math.max(20, Math.min(canvasH - 20, Math.round(cyEmu * emuScale)));

      const pMatches = spXml.matchAll(/<a:p\b[^>]*>(.*?)<\/a:p>/gs);
      const shapeParas: ParagraphInfo[] = [];

      for (const pMatch of pMatches) {
        const pXml = pMatch[1];
        const isBullet = pXml.includes('<a:buChar') || pXml.includes('<a:buAutoNum');

        let align: 'left' | 'center' | 'right' | undefined;
        if (pXml.includes('algn="ctr"')) align = 'center';
        else if (pXml.includes('algn="r"')) align = 'right';
        else if (pXml.includes('algn="l"')) align = 'left';

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

        let fontSizePx: number | undefined;
        const szMatch = pXml.match(/<a:rPr\b[^>]*sz="(\d+)"/);
        if (szMatch) {
          const szPt = parseInt(szMatch[1], 10) / 100;
          fontSizePx = Math.round(szPt * 1.25);
        }

        let colorHex: string | undefined;
        const clrMatch = pXml.match(/<a:srgbClr\b[^>]*val="([A-Fa-f0-9]{6})"/);
        if (clrMatch) {
          colorHex = `#${clrMatch[1]}`;
        }

        const isBold = pXml.includes('b="1"');

        if (paraText) {
          shapeParas.push({ text: paraText, isBullet, fontSizePx, colorHex, align, isBold });
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

    // 2. Pictures (<p:pic>)
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

        const x = Math.max(10, Math.min(canvasW - 20, Math.round(xEmu * emuScale)));
        const y = Math.max(10, Math.min(canvasH - 20, Math.round(yEmu * emuScale)));
        const width = Math.max(50, Math.min(canvasW, Math.round(cxEmu * emuScale)));
        const height = Math.max(50, Math.min(canvasH, Math.round(cyEmu * emuScale)));

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

    // 3. Tables (<a:tbl> inside <p:graphicFrame>)
    const graphicMatches = slideXmlStr.matchAll(/<p:graphicFrame\b[^>]*>(.*?)<\/p:graphicFrame>/gs);
    for (const gfMatch of graphicMatches) {
      const gfXml = gfMatch[1];
      if (gfXml.includes('<a:tbl')) {
        const trMatches = gfXml.matchAll(/<a:tr\b[^>]*>(.*?)<\/a:tr>/gs);
        const tableRows: string[][] = [];

        for (const trMatch of trMatches) {
          const trXml = trMatch[1];
          const tcMatches = trXml.matchAll(/<a:tc\b[^>]*>(.*?)<\/a:tc>/gs);
          const rowCells: string[] = [];

          for (const tcMatch of tcMatches) {
            const tcXml = tcMatch[1];
            const tMatches = tcXml.matchAll(/<a:t\b[^>]*>(.*?)<\/a:t>/gs);
            const cellText = Array.from(tMatches).map(t => t[1]).join(' ').trim();
            rowCells.push(cellText);
            if (cellText) paragraphsList.push(cellText);
          }
          if (rowCells.some(Boolean)) tableRows.push(rowCells);
        }

        if (tableRows.length > 0) {
          const offMatch = gfXml.match(/<a:off\b[^>]*x="(\d+)"[^>]*y="(\d+)"/);
          const extMatch = gfXml.match(/<a:ext\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);

          const xEmu = offMatch ? parseInt(offMatch[1], 10) : 914400;
          const yEmu = offMatch ? parseInt(offMatch[2], 10) : 2743200;
          const cxEmu = extMatch ? parseInt(extMatch[1], 10) : 7315200;
          const cyEmu = extMatch ? parseInt(extMatch[2], 10) : 1828800;

          const x = Math.max(10, Math.min(canvasW - 20, Math.round(xEmu * emuScale)));
          const y = Math.max(10, Math.min(canvasH - 20, Math.round(yEmu * emuScale)));
          const width = Math.max(100, Math.min(canvasW, Math.round(cxEmu * emuScale)));
          const height = Math.max(50, Math.min(canvasH, Math.round(cyEmu * emuScale)));

          shapes.push({
            type: 'table',
            tableRows,
            x,
            y,
            width,
            height,
          });
        }
      }
    }

    const titleShape = shapes.find(s => s.type === 'title') || shapes.find(s => s.type === 'text');
    const title = titleShape?.paragraphs?.[0]?.text || paragraphsList[0] || `Slide ${i + 1}`;
    const bullets = paragraphsList.filter(p => p !== title);
    const fullText = `Slide ${i + 1}: ${title}\n` + bullets.map(b => `- ${b}`).join('\n');

    // Render SVG slide card using foreignObject HTML layout
    const svgImageUrl = renderHighFidelitySlideSvg({
      slideIndex: i + 1,
      totalSlides: orderedSlideFiles.length,
      title,
      bullets,
      shapes,
      bgColor,
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
 * Renders a high-fidelity SVG representation of the slide layout, shapes, and tables using foreignObject HTML layout.
 */
function renderHighFidelitySlideSvg(opts: {
  slideIndex: number;
  totalSlides: number;
  title: string;
  bullets: string[];
  shapes: ShapeElement[];
  bgColor: string;
  canvasW: number;
  canvasH: number;
  sourceName: string;
  embeddedImage: string | null;
}): string {
  const { slideIndex, totalSlides, title, bullets, shapes, bgColor, canvasW, canvasH, sourceName, embeddedImage } = opts;

  let shapesContent = '';

  // Render pictures
  const imageShapes = shapes.filter(s => s.type === 'image' && s.imageDataUrl);
  if (imageShapes.length > 0) {
    imageShapes.forEach((imgShape) => {
      shapesContent += `
        <image href="${imgShape.imageDataUrl}" x="${imgShape.x}" y="${imgShape.y}" width="${imgShape.width}" height="${imgShape.height}" preserveAspectRatio="xMidYMid meet"/>
      `;
    });
  } else if (embeddedImage) {
    shapesContent += `
      <image href="${embeddedImage}" x="${canvasW - 380}" y="140" width="320" height="300" preserveAspectRatio="xMidYMid meet"/>
    `;
  }

  // Render tables
  const tableShapes = shapes.filter(s => s.type === 'table' && s.tableRows);
  tableShapes.forEach((tShape) => {
    if (!tShape.tableRows) return;
    let tableHtml = `<table style="width:100%; border-collapse:collapse; color:#f8fafc; font-family:system-ui, -apple-system, sans-serif; font-size:12px;">`;
    tShape.tableRows.forEach((row) => {
      tableHtml += `<tr>`;
      row.forEach((cellText) => {
        tableHtml += `<td style="border:1px solid #475569; padding:6px; background:#334155;">${escapeXml(truncateText(cellText, 30))}</td>`;
      });
      tableHtml += `</tr>`;
    });
    tableHtml += `</table>`;

    shapesContent += `
      <foreignObject x="${tShape.x}" y="${tShape.y}" width="${tShape.width}" height="${tShape.height}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%; height:100%; overflow:hidden;">
          ${tableHtml}
        </div>
      </foreignObject>
    `;
  });

  // Render text shapes (titles and text boxes) using foreignObject HTML layout for word-wrapping and column layout
  const textShapes = shapes.filter(s => (s.type === 'title' || s.type === 'text') && s.paragraphs && s.paragraphs.length > 0);

  if (textShapes.length > 0) {
    textShapes.forEach((tShape) => {
      if (!tShape.paragraphs) return;

      let htmlParas = '';
      tShape.paragraphs.forEach((p) => {
        const alignCss = p.align ? `text-align:${p.align};` : '';
        const colorCss = p.colorHex ? `color:${p.colorHex};` : 'color:#cbd5e1;';
        const fontSizeCss = p.fontSizePx ? `font-size:${p.fontSizePx}px;` : (tShape.type === 'title' ? 'font-size:26px;' : 'font-size:18px;');
        const weightCss = (p.isBold || tShape.type === 'title') ? 'font-weight:700;' : 'font-weight:400;';

        if (tShape.type === 'title') {
          htmlParas += `<h2 style="margin:0 0 8px 0; color:#f8fafc; ${fontSizeCss} ${weightCss} ${alignCss} line-height:1.2;">${escapeXml(p.text)}</h2>`;
        } else {
          const prefix = p.isBullet ? '• ' : '';
          htmlParas += `<p style="margin:0 0 6px 0; ${colorCss} ${fontSizeCss} ${weightCss} ${alignCss} line-height:1.35; word-wrap:break-word;">${prefix}${escapeXml(p.text)}</p>`;
        }
      });

      shapesContent += `
        <foreignObject x="${tShape.x}" y="${tShape.y}" width="${tShape.width}" height="${tShape.height}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%; height:100%; overflow:hidden; font-family:system-ui, -apple-system, sans-serif;">
            ${htmlParas}
          </div>
        </foreignObject>
      `;
    });
  } else {
    // Fallback text formatting if no shapes matched
    const displayTitle = escapeXml(truncateText(title, 60));
    const displayBullets = bullets.slice(0, 5).map(b => escapeXml(truncateText(b, 85)));

    let bulletsHtml = `<h2 style="margin:0 0 16px 0; color:#f8fafc; font-size:28px; font-weight:700; line-height:1.2;">${displayTitle}</h2>`;
    displayBullets.forEach((b) => {
      bulletsHtml += `<p style="margin:0 0 8px 0; color:#cbd5e1; font-size:18px; line-height:1.35;">• ${b}</p>`;
    });

    shapesContent += `
      <foreignObject x="70" y="120" width="${canvasW - 460}" height="${canvasH - 180}">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%; height:100%; overflow:hidden; font-family:system-ui, -apple-system, sans-serif;">
          ${bulletsHtml}
        </div>
      </foreignObject>
    `;
  }

  const viewBox = `0 0 ${canvasW} ${canvasH}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="${viewBox}">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="${bgColor === '#1e293b' ? '#1e293b' : bgColor}"/>
      </linearGradient>
    </defs>
    <rect width="${canvasW}" height="${canvasH}" fill="url(#bgGrad)"/>
    <rect x="25" y="25" width="${canvasW - 50}" height="${canvasH - 50}" rx="16" fill="${bgColor}" stroke="#334155" stroke-width="2"/>
    <text x="65" y="70" fill="#38bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700">SLIDE ${slideIndex} OF ${totalSlides}</text>
    <line x1="65" y1="85" x2="${canvasW - 65}" y2="85" stroke="#334155" stroke-width="2"/>
    ${shapesContent}
    <text x="65" y="${canvasH - 38}" fill="#64748b" font-family="system-ui, -apple-system, sans-serif" font-size="13">Source: ${escapeXml(truncateText(sourceName, 40))}</text>
  </svg>`;

  const base64Svg = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}
