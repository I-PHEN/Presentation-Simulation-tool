import { NextResponse } from 'next/server';
import Cartesia from '@cartesia/cartesia-js';

const cartesia = new Cartesia({
  apiKey: process.env.CARTESIA_API_KEY || 'missing_key',
});

const MAX_TRANSCRIPT_LENGTH = 5_000;
const MAX_VOICE_ID_LENGTH = 128;
const voiceIdPattern = /^[A-Za-z0-9-]+$/;

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
    }

    const { text, voiceId } = body || {};

    if (
      typeof text !== 'string' || text.trim().length === 0 || text.trim().length > MAX_TRANSCRIPT_LENGTH ||
      typeof voiceId !== 'string' || voiceId.length === 0 || voiceId.length > MAX_VOICE_ID_LENGTH || !voiceIdPattern.test(voiceId)
    ) {
      return NextResponse.json({ error: 'Invalid text or voiceId' }, { status: 400 });
    }

    if (!process.env.CARTESIA_API_KEY) {
       throw new Error("Missing CARTESIA_API_KEY in environment variables");
    }

    // Call Cartesia Sonic
    const response = await cartesia.tts.generate({
      model_id: 'sonic-3.5',
      transcript: text.trim(),
      voice: {
        mode: 'id',
        id: voiceId,
      },
      output_format: {
        container: 'mp3',
        sample_rate: 44100,
        bit_rate: 128000,
      },
    });

    const audioBlob = await response.blob();
    
    return new NextResponse(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: any) {
    console.error('Cartesia TTS Error:', error);
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
  }
}
