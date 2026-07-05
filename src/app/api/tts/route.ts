import { NextResponse } from 'next/server';
import Cartesia from '@cartesia/cartesia-js';

const cartesia = new Cartesia({
  apiKey: process.env.CARTESIA_API_KEY || 'missing_key',
});

export async function POST(request: Request) {
  try {
    if (!process.env.CARTESIA_API_KEY) {
       throw new Error("Missing CARTESIA_API_KEY in environment variables");
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
    }

    const { text, voiceId } = body || {};

    if (!text || !voiceId) {
      return NextResponse.json({ error: 'Missing text or voiceId' }, { status: 400 });
    }

    // Call Cartesia Sonic
    const response = await cartesia.tts.generate({
      model_id: 'sonic-3.5',
      transcript: text,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
