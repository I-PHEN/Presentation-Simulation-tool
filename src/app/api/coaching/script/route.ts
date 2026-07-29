import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export interface CoachingScriptResponse {
  slideIndex: number;
  openingHook: string;
  talkingPoints: string[];
  rescueScript: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      slideText = '',
      slideIndex = 0,
      presenterDirectives = '',
      coachPersona = 'marcus',
      explanationDepth = 'balanced',
    } = body;

    const zai = getZAI();
    const coachName = coachPersona === 'sarah' ? 'Coach Sarah' : 'Coach Marcus';

    const prompt = `You are ${coachName}, a world-class Executive Presentation Coach.
Generate an optimal spoken rehearsal script for Slide ${slideIndex + 1} based on the slide content below.

Slide Content:
"${slideText.substring(0, 1500)}"

${presenterDirectives ? `User Custom Directives / Focus:\n"${presenterDirectives}"` : ''}
Explanation Depth Focus: ${explanationDepth}

Respond in STRICT JSON format with no markdown wrappers:
{
  "openingHook": "A powerful, 1-sentence opening hook to start presenting this slide confidently.",
  "talkingPoints": [
    "First key point expressed in natural conversational spoken English",
    "Second key point focusing on the value/metrics",
    "Third key point creating a smooth transition to the next slide"
  ],
  "rescueScript": "A complete 15-second spoken script that explains this slide perfectly."
}`;

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are an executive speechwriting AI. Always output valid JSON.' },
        { role: 'user', content: prompt },
      ],
      model: 'glm-4-flash',
      temperature: 0.7,
    });

    const rawText = response.choices[0]?.message?.content || '';
    const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({
        slideIndex,
        openingHook: parsed.openingHook || `Here is key insight for Slide ${slideIndex + 1}.`,
        talkingPoints: Array.isArray(parsed.talkingPoints) && parsed.talkingPoints.length > 0
          ? parsed.talkingPoints
          : ['Explain the main concept clearly', 'Highlight supporting evidence', 'Summarize key takeaway'],
        rescueScript: parsed.rescueScript || `On slide ${slideIndex + 1}, we focus on the core value proposition and key metrics.`,
      });
    } catch {
      // Fallback response if JSON parsing fails
      return NextResponse.json({
        slideIndex,
        openingHook: `Welcome to Slide ${slideIndex + 1}.`,
        talkingPoints: [
          'Introduce the core topic clearly.',
          'Emphasize the primary data point or value proposition.',
          'Transition smoothly into the next phase.',
        ],
        rescueScript: `On this slide, we present the key findings and outline our strategic direction clearly.`,
      });
    }
  } catch (error) {
    console.error('Error generating coaching script:', error);
    return NextResponse.json(
      { error: 'Failed to generate coaching script' },
      { status: 500 }
    );
  }
}
