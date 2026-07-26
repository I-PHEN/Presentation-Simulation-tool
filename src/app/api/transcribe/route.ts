import { NextResponse } from 'next/server';

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

    const formDataToSend = new FormData();
    formDataToSend.append('file', file, 'recording.webm');
    formDataToSend.append('model', 'whisper-large-v3-turbo');

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: formDataToSend,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Groq API Error Response:', errText);
      throw new Error(`Groq API returned status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text });
  } catch (error: any) {
    console.error('Groq STT Error:', error);
    return NextResponse.json({ error: error.message || 'Connection error.' }, { status: 500 });
  }
}
