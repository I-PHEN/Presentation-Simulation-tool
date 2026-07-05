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
              text: `You are analyzing a webcam frame of someone giving a presentation (like a Zoom call). Evaluate the following on a scale of 0-100:

1. **eyeContact** (0-100): Is the person looking at the camera? 100 = directly looking at camera, 50 = looking slightly away, 0 = not looking at camera at all
2. **posture** (0-100): How is their posture? 100 = upright, confident posture, 50 = somewhat slouched, 0 = very poor posture
3. **presence** (0-100): Overall camera presence and professionalism. Consider: Are they centered in frame? Is the framing good? Do they appear engaged? 100 = excellent presence, 0 = not visible or very poor presence

IMPORTANT: If you cannot see a person in the frame, return all scores as 0.

Return ONLY a JSON object with no other text:
{"eyeContact": <0-100>, "posture": <0-100>, "presence": <0-100>}`,
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
        { error: 'Failed to analyze frame' },
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

    // Clamp values to 0-100
    const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

    return NextResponse.json({
      eyeContact: clamp(result.eyeContact ?? 0),
      posture: clamp(result.posture ?? 0),
      presence: clamp(result.presence ?? 0),
    });
  } catch (error) {
    console.error('Error analyzing frame:', error);
    return NextResponse.json(
      { error: 'Failed to analyze frame' },
      { status: 500 }
    );
  }
}
