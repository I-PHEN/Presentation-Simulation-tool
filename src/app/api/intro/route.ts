import { NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(req: Request) {
  try {
    const { title, judges, source } = await req.json();
    // A topic rehearsal has no deck, so its "title" is the topic itself. Framing
    // it as a titled presentation is what made the welcome read wrong.
    const deckless = source === 'topic';

    const zai = await getZAI();
    const judge = judges?.[0]; // First judge introduces

    let text = 'Welcome! Please turn on your microphone whenever you are ready to begin.';
    let voice = 'd46abd1d-2d02-43e8-819f-51fb652c1c61'; // Grant - neutral American English male (Cartesia verified)
    let judgeId = judge?.id || 'system';

    if (judge) {
      try {
        const response = await zai.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are ${judge.title}. ${deckless
                ? `The speaker is about to argue the topic "${title || 'a topic of their choosing'}" out loud, with no slides. Do not mention slides or a presentation.`
                : `You are about to watch a presentation titled "${title || 'a presentation'}".`
              } Produce a short 1-sentence welcome message welcoming the speaker. End your message by telling the speaker to turn on their microphone whenever they are ready to begin.`
            }
          ],
          temperature: 0.7,
          max_tokens: 60,
        });
        if (response.choices?.[0]?.message?.content) {
          text = response.choices[0].message.content;
        }
      } catch (e) {
        console.error('LLM intro generation failed', e);
      }
    }

    return NextResponse.json({ 
      text, 
      judgeId,
      voice
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ 
      text: 'Welcome! Please turn on your microphone whenever you are ready to begin.', 
      judgeId: 'system', 
      voice: 'd46abd1d-2d02-43e8-819f-51fb652c1c61' 
    });
  }
}
