import { NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(req: Request) {
  try {
    const { transcript, judges, activeHandRaised } = await req.json();
    
    const zai = await getZAI();

    // If a hand is already raised, check if the speaker allowed it
    if (activeHandRaised) {
      const response = await zai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are analyzing a presentation transcript. A judge has raised their hand. 
Read the recent transcript and determine if the speaker explicitly granted permission (e.g. "yes", "go ahead", "what's your question"). 
Respond ONLY with a JSON object: {"speakerAllowed": boolean}`
          },
          { role: 'user', content: transcript || '(silence)' }
        ],
        response_format: { type: 'json_object' }
      });
      const result = JSON.parse(response.choices[0]?.message?.content || '{"speakerAllowed": false}');
      return NextResponse.json({ speakerAllowed: result.speakerAllowed, action: 'none' });
    }

    // Otherwise, check for new reactions or questions
    const judgeDescriptions = judges.map((j: any) => `- ID: ${j.id}, Persona: ${j.title}`).join('\n');
    
    const response = await zai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are analyzing a live presentation transcript.
The audience consists of:
${judgeDescriptions}

Based on the transcript so far, decide if one of the judges should raise their hand to ask a question, or if they should just react (e.g. nodding, thinking).
Only raise a hand if there's a clear opening, confusion, or a highly relevant point. 
Do NOT raise a hand too frequently (maybe 10% chance if the speaker has been talking a while).

Respond ONLY with a JSON object:
{
  "action": "none" | "nodding" | "thinking" | "raise_hand",
  "judgeId": "ID of the judge (optional, required if action is not none)"
}`
        },
        { role: 'user', content: transcript || '(silence)' }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"action": "none"}');
    return NextResponse.json(result);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ action: 'none', error: String(error) });
  }
}
