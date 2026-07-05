import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || 'missing_key',
  baseURL: 'https://api.groq.com/openai/v1',
});

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
       throw new Error("Missing GROQ_API_KEY in environment variables");
    }

    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    
    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert Blob to File object which the OpenAI SDK requires
    const audioFile = new File([file], 'recording.webm', { type: file.type || 'audio/webm' });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error('Groq STT Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
