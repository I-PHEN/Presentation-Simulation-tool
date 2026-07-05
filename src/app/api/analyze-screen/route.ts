import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body as { image: string };

    if (!image) {
      return NextResponse.json(
        { error: 'image is required' },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are viewing a screen share from someone giving a presentation or demo. Describe what you see on screen in 1-2 concise sentences. Focus on:
- What application or content is being shown (e.g., "A code editor showing Python code", "A dashboard with sales metrics", "A product demo of a mobile app")
- Any key visual elements that are prominent (charts, code, UI elements, text)
- What the presenter seems to be demonstrating or explaining

If the screen appears blank or is a desktop with no clear content, say "No clear presentation content visible."

Return ONLY a JSON object:
{"description": "<your 1-2 sentence description>"}`,
            },
            {
              type: 'image_url',
              image_url: { url: image },
            },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'Failed to analyze screen' },
        { status: 500 }
      );
    }

    // Parse the response - handle markdown code blocks
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    const result = JSON.parse(cleaned);

    return NextResponse.json({
      description: result.description || 'No clear content visible',
    });
  } catch (error) {
    console.error('Error analyzing screen:', error);
    return NextResponse.json(
      { error: 'Failed to analyze screen' },
      { status: 500 }
    );
  }
}
