import { NextResponse } from 'next/server';
import Cartesia from '@cartesia/cartesia-js';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';

const MAX_TRANSCRIPT_LENGTH = 5_000;
const MAX_VOICE_ID_LENGTH = 128;
const voiceIdPattern = /^[A-Za-z0-9-]+$/;

const VOICE_MODEL_MAP: Record<string, string> = {
  'a7a59115-2425-4192-844c-1e98ec7d6877': 'aura-asteria-en',
  '533b2990-5b82-45a4-b9f2-367776972ca6': 'aura-orion-en',
  'd46abd1d-2d02-43e8-819f-51fb652c1c61': 'aura-helios-en',
};

export async function POST(request: Request) {
  try {
    const identity = await authenticateRequest(request);
    if (isAuthenticationFailure(identity)) return identity;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
    }

    const { text, voiceId } = body || {};

    if (
      typeof text !== 'string' || text.trim().length === 0 || text.trim().length > MAX_TRANSCRIPT_LENGTH ||
      typeof voiceId !== 'string' || voiceId.length === 0 || voiceId.length > MAX_VOICE_ID_LENGTH || !voiceIdPattern.test(voiceId)
    ) {
      return NextResponse.json({ error: 'Invalid text or voiceId' }, { status: 400 });
    }

    const deepgramKey = process.env.DEEPGRAM_API_KEY;

    if (deepgramKey) {
      const model = VOICE_MODEL_MAP[voiceId] || (voiceId.startsWith('aura-') ? voiceId : 'aura-helios-en');
      try {
        const dgRes = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${deepgramKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: text.trim() }),
        });

        if (dgRes.ok) {
          const audioBuffer = await dgRes.arrayBuffer();
          return new NextResponse(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
            },
          });
        }
        console.warn('Deepgram TTS returned non-OK status:', dgRes.status);
      } catch (dgErr) {
        console.error('Deepgram TTS fetch error:', dgErr);
      }
    }

    // Fallback to Cartesia if Deepgram failed and CARTESIA_API_KEY is available
    if (process.env.CARTESIA_API_KEY) {
      const cartesia = new Cartesia({ apiKey: process.env.CARTESIA_API_KEY });
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
    }

    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: 'TTS generation failed' }, { status: 500 });
  }
}

