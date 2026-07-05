import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, title } = body as { content: string; title: string };

    if (!content || !title) {
      return NextResponse.json(
        { error: 'content and title are required' },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    const systemPrompt = `You are an expert presentation analyst. Analyze the given presentation content and provide a structured analysis. You MUST return your response as a valid JSON object with the following structure:
{
  "summary": "A concise summary of the presentation (2-3 sentences)",
  "keyPoints": ["point1", "point2", "point3", ...],
  "questions": {
    "investor": ["question1", "question2", "question3"],
    "professor": ["question1", "question2", "question3"],
    "hackathon_judge": ["question1", "question2", "question3"],
    "customer": ["question1", "question2", "question3"],
    "executive": ["question1", "question2", "question3"]
  }
}

Rules:
- summary: A clear, concise summary in 2-3 sentences
- keyPoints: 5-8 key concepts or main points from the presentation
- questions: For each persona, generate 3-5 likely questions that type of audience member would ask
  - investor: Focus on business model, market size, revenue, ROI, competition, team
  - professor: Focus on methodology, evidence, rigor, literature, logical consistency
  - hackathon_judge: Focus on innovation, technical implementation, scalability, demo quality, impact
  - customer: Focus on value proposition, ease of use, pricing, alternatives, real-world utility
  - executive: Focus on strategic alignment, ROI, risk, timeline, resource needs

Return ONLY the JSON object, no other text.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        {
          role: 'user',
          content: `Analyze this presentation titled "${title}":\n\n${content}`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      return NextResponse.json(
        { error: 'Failed to generate analysis' },
        { status: 500 }
      );
    }

    // Parse the JSON response - handle potential markdown code blocks
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    const analysis = JSON.parse(cleanedResponse);

    // Validate the structure
    if (
      !analysis.summary ||
      !Array.isArray(analysis.keyPoints) ||
      !analysis.questions
    ) {
      return NextResponse.json(
        { error: 'Invalid analysis structure returned by LLM' },
        { status: 500 }
      );
    }

    // Create a new session with the analysis results
    const session = await db.session.create({
      data: {
        title,
        content,
        summary: analysis.summary,
        keyPoints: JSON.stringify(analysis.keyPoints),
        questions: JSON.stringify(analysis.questions),
        status: 'analyzed',
      },
    });

    return NextResponse.json({
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      questions: analysis.questions,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error analyzing presentation:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse LLM response as JSON' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to analyze presentation' },
      { status: 500 }
    );
  }
}
