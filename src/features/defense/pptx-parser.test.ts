import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parsePptxInPureJs } from './pptx-parser';

describe('parsePptxInPureJs', () => {
  it('parses PPTX slides and returns formatted slide text and SVG images', async () => {
    const zip = new JSZip();

    const slide1Xml = `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:txBody>
              <a:p><a:r><a:t>Project Architecture &amp; Strategy</a:t></a:r></a:p>
              <a:p><a:r><a:t>First bullet point detailing system design</a:t></a:r></a:p>
              <a:p><a:r><a:t>Second bullet point covering performance</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`;

    const slide2Xml = `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:txBody>
              <a:p><a:r><a:t>Results &amp; Future Work</a:t></a:r></a:p>
              <a:p><a:r><a:t>High accuracy achieved across tests</a:t></a:r></a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`;

    zip.file('ppt/slides/slide1.xml', slide1Xml);
    zip.file('ppt/slides/slide2.xml', slide2Xml);

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await parsePptxInPureJs(buffer, 'test-presentation.pptx');

    expect(result.totalSlides).toBe(2);
    expect(result.slides).toHaveLength(2);
    expect(result.text).toContain('Project Architecture & Strategy');
    expect(result.text).toContain('First bullet point detailing system design');
    expect(result.text).toContain('Results & Future Work');
    expect(result.slides[0]).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.deck.sourceName).toBe('test-presentation.pptx');
    expect(result.deck.slides[0].index).toBe(1);
    expect(result.deck.slides[0].text).toContain('Project Architecture & Strategy');
  });

  it('parses tables and respects presentation.xml slide order', async () => {
    const zip = new JSZip();

    const presentationXml = `<p:presentation xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:sldIdLst>
        <p:sldId r:id="rId2"/>
        <p:sldId r:id="rId1"/>
      </p:sldIdLst>
    </p:presentation>`;

    const presentationRels = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Target="slides/slide1.xml"/>
      <Relationship Id="rId2" Target="slides/slide2.xml"/>
    </Relationships>`;

    const slide1Xml = `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Slide 1 Title</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
    </p:sld>`;

    const slide2Xml = `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree><p:graphicFrame><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>Metric</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>Value</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></p:graphicFrame></p:spTree></p:cSld>
    </p:sld>`;

    zip.file('ppt/presentation.xml', presentationXml);
    zip.file('ppt/_rels/presentation.xml.rels', presentationRels);
    zip.file('ppt/slides/slide1.xml', slide1Xml);
    zip.file('ppt/slides/slide2.xml', slide2Xml);

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await parsePptxInPureJs(buffer, 'ordered.pptx');

    expect(result.totalSlides).toBe(2);
    // Slide 2 is ordered first via rId2
    expect(result.deck.slides[0].text).toContain('Metric');
    expect(result.deck.slides[1].text).toContain('Slide 1 Title');
  });

  it('throws error when zip contains no slides', async () => {
    const zip = new JSZip();
    zip.file('readme.txt', 'hello');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    await expect(parsePptxInPureJs(buffer, 'empty.pptx')).rejects.toThrow('No slides found');
  });
});
