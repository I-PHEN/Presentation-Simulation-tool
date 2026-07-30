const path = require('path');
const pptxgen = require('pptxgenjs');

async function generatePPTX() {
  const pptx = new pptxgen();

  // Set 16:9 Widescreen layout
  pptx.layout = 'LAYOUT_16x9';

  // ----------------------------------------------------
  // SLIDE 1: Title & Core Problem
  // ----------------------------------------------------
  const slide1 = pptx.addSlide();
  slide1.background = { fill: '0F172A' };

  // Top Accent Line
  slide1.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6, y: 0.5, w: 12.13, h: 0.06,
    fill: { color: '3B82F6' }
  });

  // Category Tag
  slide1.addText('SHARKPIT PITCH DECK', {
    x: 0.6, y: 0.7, w: 12.13, h: 0.3,
    fontSize: 12, bold: true, color: '60A5FA', fontFace: 'Arial'
  });

  // Slide Title
  slide1.addText('SharkPit — Active AI Presentation Defense Platform', {
    x: 0.6, y: 1.0, w: 12.13, h: 0.8,
    fontSize: 26, bold: true, color: 'F8FAFC', fontFace: 'Arial'
  });

  // Card Content
  slide1.addText([
    { text: 'Core Realization:\n', options: { fontSize: 18, bold: true, color: '60A5FA' } },
    { text: 'In the era of AI coding agents, building product is fast—defending under live pressure is the ultimate bottleneck.\n\n', options: { fontSize: 16, color: 'F8FAFC', italic: true } },
    { text: '• Active AI Examiner Panel: ', options: { fontSize: 15, bold: true, color: '38BDF8' } },
    { text: 'Interrupts presenters mid-slide with grounded curveball questions.\n', options: { fontSize: 15, color: 'E2E8F0' } },
    { text: '• Guided Coaching Room: ', options: { fontSize: 15, bold: true, color: '38BDF8' } },
    { text: 'Interactive teleprompter, depth controls, and Coach Rescue scripts.\n', options: { fontSize: 15, color: 'E2E8F0' } },
    { text: '• Telemetry & Analytics: ', options: { fontSize: 15, bold: true, color: '38BDF8' } },
    { text: 'Detects slide reliance, WPM tempo, and generates 7-dimension reports.', options: { fontSize: 15, color: 'E2E8F0' } }
  ], {
    x: 0.6, y: 2.0, w: 12.13, h: 4.6,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
    margin: 0.4,
    rectRadius: 0.1
  });

  // ----------------------------------------------------
  // SLIDE 2: How SharkPit Works
  // ----------------------------------------------------
  const slide2 = pptx.addSlide();
  slide2.background = { fill: '0F172A' };

  slide2.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6, y: 0.5, w: 12.13, h: 0.06,
    fill: { color: '3B82F6' }
  });

  slide2.addText('CORE PRODUCT ARCHITECTURE', {
    x: 0.6, y: 0.7, w: 12.13, h: 0.3,
    fontSize: 12, bold: true, color: '60A5FA', fontFace: 'Arial'
  });

  slide2.addText('How SharkPit Sparring Works', {
    x: 0.6, y: 1.0, w: 12.13, h: 0.8,
    fontSize: 26, bold: true, color: 'F8FAFC', fontFace: 'Arial'
  });

  // 3 Feature Cards
  const cards = [
    {
      title: '1. Coaching Room',
      body: 'Master delivery with real-time teleprompter, talking points, explanation depth controls, and one-click Coach Rescue model pitch scripts.'
    },
    {
      title: '2. Defense Room',
      body: 'Face high-stakes AI examiner panels (VC Investor, Recruiter) that interrupt mid-slide to challenge your claims with curveballs.'
    },
    {
      title: '3. Grounded Telemetry',
      body: 'Get a 7-dimension evaluation report with exact presenter quote citations, weakness diagnosis, and tailored practice drills.'
    }
  ];

  cards.forEach((card, idx) => {
    const xPos = 0.6 + idx * 4.1;
    slide2.addText([
      { text: `${card.title}\n\n`, options: { fontSize: 18, bold: true, color: '60A5FA' } },
      { text: card.body, options: { fontSize: 14, color: 'E2E8F0', lineSpacing: 20 } }
    ], {
      x: xPos, y: 2.0, w: 3.9, h: 4.6,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 1 },
      margin: 0.3,
      rectRadius: 0.1
    });
  });

  // ----------------------------------------------------
  // SLIDE 3: Tech Stack & Educational Impact
  // ----------------------------------------------------
  const slide3 = pptx.addSlide();
  slide3.background = { fill: '0F172A' };

  slide3.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6, y: 0.5, w: 12.13, h: 0.06,
    fill: { color: '3B82F6' }
  });

  slide3.addText('IMPACT & TECH STACK', {
    x: 0.6, y: 0.7, w: 12.13, h: 0.3,
    fontSize: 12, bold: true, color: '60A5FA', fontFace: 'Arial'
  });

  slide3.addText('Technology Stack & Educational Value', {
    x: 0.6, y: 1.0, w: 12.13, h: 0.8,
    fontSize: 26, bold: true, color: 'F8FAFC', fontFace: 'Arial'
  });

  slide3.addText([
    { text: 'AI & Full-Stack Technologies:\n', options: { fontSize: 18, bold: true, color: '60A5FA' } },
    { text: '• LLM Engine: ', options: { fontSize: 15, bold: true, color: '38BDF8' } },
    { text: 'Groq Llama 3 (Ultra low latency streaming Q&A)\n', options: { fontSize: 15, color: 'E2E8F0' } },
    { text: '• Voice & Speech: ', options: { fontSize: 15, bold: true, color: '38BDF8' } },
    { text: 'Cartesia Neural TTS & Web Speech API\n', options: { fontSize: 15, color: 'E2E8F0' } },
    { text: '• Framework: ', options: { fontSize: 15, bold: true, color: '38BDF8' } },
    { text: 'Next.js 15, React 19, TypeScript, TailwindCSS, Prisma\n\n', options: { fontSize: 15, color: 'E2E8F0' } },
    { text: 'Educational & Pitch Value:\n', options: { fontSize: 18, bold: true, color: '60A5FA' } },
    { text: 'Transforms passive presentation reading into active, high-stakes defense. Founders, students, and job seekers enter live rooms bulletproof.', options: { fontSize: 15, color: 'F8FAFC' } }
  ], {
    x: 0.6, y: 2.0, w: 12.13, h: 4.6,
    fill: { color: '1E293B' },
    line: { color: '334155', width: 1 },
    margin: 0.4,
    rectRadius: 0.1
  });

  const outputPath1 = path.join(process.cwd(), 'SharkPit_Pitch_Deck_Clean.pptx');
  await pptx.writeFile({ fileName: outputPath1 });
  console.log('Successfully generated 100% native PowerPoint presentation at:', outputPath1);

  try {
    const outputPath2 = path.join(process.cwd(), 'SharkPit_Pitch_Deck.pptx');
    await pptx.writeFile({ fileName: outputPath2 });
    console.log('Also updated SharkPit_Pitch_Deck.pptx at:', outputPath2);
  } catch (err) {
    console.log('Note: SharkPit_Pitch_Deck.pptx was locked by PowerPoint (please close it first). Created SharkPit_Pitch_Deck_Clean.pptx instead!');
  }
}

generatePPTX().catch(console.error);
