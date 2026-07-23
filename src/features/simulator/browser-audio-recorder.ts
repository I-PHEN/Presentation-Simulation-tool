'use client';

import type { RecorderSink } from './session-recorder';

// DOM glue: one continuous mic stream + MediaRecorder for the whole session.
// Independent of the STT, which opens/closes its own per-utterance stream.
// Not unit-tested (real getUserMedia/MediaRecorder) — verified in-browser.
export async function acquireBrowserRecorder(): Promise<RecorderSink> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return {
    start: () => recorder.start(),
    stop: (): Promise<Blob> => new Promise((resolve) => {
      if (recorder.state === 'inactive') { resolve(new Blob(chunks, { type: 'audio/webm' })); return; }
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
      recorder.stop();
    }),
    release: () => stream.getTracks().forEach((t) => t.stop()),
  };
}
