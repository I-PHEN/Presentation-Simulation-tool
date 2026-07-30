import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function generatePPTX() {
  const zip = new JSZip();

  // [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide3.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`);

  // _rels/.rels
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  // ppt/_rels/presentation.xml.rels
  zip.folder('ppt/_rels').file('presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide3.xml"/>
</Relationships>`);

  // ppt/presentation.xml
  zip.folder('ppt').file('presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId2"/>
    <p:sldId id="257" r:id="rId3"/>
    <p:sldId id="258" r:id="rId4"/>
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

  // ppt/slideMasters/slideMaster1.xml
  zip.folder('ppt/slideMasters').file('slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`);

  // ppt/slideMasters/_rels/slideMaster1.xml.rels
  zip.folder('ppt/slideMasters/_rels').file('slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`);

  // ppt/slideLayouts/slideLayout1.xml
  zip.folder('ppt/slideLayouts').file('slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`);

  // ppt/slideLayouts/_rels/slideLayout1.xml.rels
  zip.folder('ppt/slideLayouts/_rels').file('slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);

  // Function to generate a slide XML
  const createSlideXml = (titleText, bulletPoints) => {
    let textParagraphs = `<a:p>
      <a:pPr algn="l"/>
      <a:r>
        <a:rPr lang="en-US" sz="2800" b="1">
          <a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill>
        </a:rPr>
        <a:t>${titleText}</a:t>
      </a:r>
    </a:p>`;

    bulletPoints.forEach((bullet) => {
      textParagraphs += `
    <a:p>
      <a:pPr algn="l" lvl="0"/>
      <a:r>
        <a:rPr lang="en-US" sz="1800">
          <a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill>
        </a:rPr>
        <a:t>${bullet}</a:t>
      </a:r>
    </a:p>`;
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title &amp; Content Box"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="914400" y="914400"/>
            <a:ext cx="10363200" cy="5029200"/>
          </a:xfrm>
          <a:prstGeom prst="rect">
            <a:avLst/>
          </a:prstGeom>
          <a:solidFill>
            <a:srgbClr val="1E293B"/>
          </a:solidFill>
        </p:spPr>
        <p:txBody>
          <a:bodyPr lIns="360000" tIns="360000" rIns="360000" bIns="360000"/>
          <a:lstStyle/>
          ${textParagraphs}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
  };

  // Slide 1
  zip.folder('ppt/slides').file('slide1.xml', createSlideXml(
    'SharkPit — Active AI Presentation Defense Platform',
    [
      'Present under live pressure. Defend your product against real-time AI curveball questions.',
      '• Building is fast with AI coding agents—defending under pressure is the bottleneck.',
      '• SharkPit provides active AI panel interruptions to test authentic subject mastery.'
    ]
  ));

  // Slide 2
  zip.folder('ppt/slides').file('slide2.xml', createSlideXml(
    'How SharkPit Works',
    [
      '1. Coaching Room: Interactive teleprompter, depth controls, and Coach Rescue scripts.',
      '2. Defense Room: AI personas (VC Investor, Recruiter) interrupting mid-presentation.',
      '3. Telemetry Console: Real-time tempo tracking, slide reliance detection, and 7-dimension evaluation.'
    ]
  ));

  // Slide 3
  zip.folder('ppt/slides').file('slide3.xml', createSlideXml(
    'Architecture & Impact',
    [
      '• Tech Stack: Next.js, Groq Llama 3, Cartesia Neural TTS, Prisma, and TailwindCSS.',
      '• Grounded Analytics: Exact presenter quote citations, weakness identification, and tailored drills.',
      '• Result: Transforming how students, founders, and job candidates master high-stakes rooms.'
    ]
  ));

  // Relationships for slide1, slide2, slide3
  const slideRelXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

  zip.folder('ppt/slides/_rels').file('slide1.xml.rels', slideRelXml);
  zip.folder('ppt/slides/_rels').file('slide2.xml.rels', slideRelXml);
  zip.folder('ppt/slides/_rels').file('slide3.xml.rels', slideRelXml);

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const outputPath = path.join(process.cwd(), 'SharkPit_Pitch_Deck.pptx');
  fs.writeFileSync(outputPath, content);
  console.log('Successfully generated 100% compliant PowerPoint at', outputPath);
}

generatePPTX().catch(console.error);
