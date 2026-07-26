'use client';

import { authenticatedFetch } from './authenticated-fetch';

let modelsLoading = false;
let modelsLoaded = false;
let activeAudioElement: HTMLAudioElement | null = null;
let activePlayback: { audio: HTMLAudioElement; url: string; finish: (result: AudioPlayResult) => void } | null = null;

export async function initVoiceEngine() {
  if (typeof window === 'undefined') return;
  if (modelsLoaded || modelsLoading) return;
  modelsLoading = true;
  
  try {
    // We no longer need to download heavy WASM models locally!
    // The APIs are ready to go immediately.
    modelsLoaded = true;
  } catch (err) {
    console.error('Failed to init voice engine:', err);
  } finally {
    modelsLoading = false;
  }
}

export function isEngineLoaded() {
  return modelsLoaded;
}

export async function generateTTS(text: string, voiceId: string = 'd46abd1d-2d02-43e8-819f-51fb652c1c61') {
  if (!modelsLoaded) {
    await initVoiceEngine();
  }

  // Call our secure Cartesia TTS API route
  const res = await authenticatedFetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceId })
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'TTS generation failed');
  }
  
  const blob = await res.blob();
  return { audio: blob };
}

export function stopAudioPlayback() {
  if (activePlayback) {
    const playback = activePlayback;
    try {
      playback.audio.pause();
      playback.audio.src = '';
    } catch (err) {
      // Ignore
    }
    playback.finish({ played: false, error: 'playback' });
  }
}

let audioUnlocked = false;

export function unlockAudio() {
  // Call this on ANY user interaction (click, keydown) to pre-unlock audio
  if (audioUnlocked) return;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  ctx.resume().then(() => {
    audioUnlocked = true;
    ctx.close();
  });
}

export function isAudioUnlocked() {
  return audioUnlocked;
}

export type AudioPlayResult = { played: true } | { played: false; error: 'autoplay' | 'playback' };

/** `onDuration` fires once the clip's length is known, so callers can pace a
 * caption reveal to the actual speech instead of guessing. */
export function playAudioData(audioResult: { audio: Blob }, onDuration?: (durationMs: number) => void): Promise<AudioPlayResult> {
  if (activePlayback) stopAudioPlayback();
  return new Promise((resolve) => {
    let settled = false;
    let url: string | null = null;
    let audio: HTMLAudioElement | null = null;
    const finish = (result: AudioPlayResult) => {
      if (settled) return;
      settled = true;
      if (url) URL.revokeObjectURL(url);
      if (activeAudioElement === audio) activeAudioElement = null;
      if (activePlayback?.audio === audio) activePlayback = null;
      resolve(result);
    };
    try {
      const blob = audioResult.audio;
      url = URL.createObjectURL(blob);
      audio = new Audio(url);
      audio.volume = 1.0;
      
      activeAudioElement = audio;
      activePlayback = { audio, url, finish };
      
      audio.onloadedmetadata = () => {
        const seconds = audio?.duration;
        if (onDuration && typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) onDuration(seconds * 1000);
      };

      audio.onended = () => {
        finish({ played: true });
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error', e);
        finish({ played: false, error: 'playback' });
      };
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => { audioUnlocked = true; })
          .catch(err => {
            console.warn('Audio autoplay blocked by browser:', err.message);
            const autoplay = err?.name === 'NotAllowedError';
            if (autoplay) audioUnlocked = false;
            finish({ played: false, error: autoplay ? 'autoplay' : 'playback' });
          });
      }
    } catch (err) {
      console.error('Audio playback setup failed', err);
      finish({ played: false, error: 'playback' });
    }
  });
}

// STT Implementation using Web Speech API for live transcription
// and Groq Whisper for the final high-quality transcript
export async function createSTT(
  onUpdate: (text: string) => void,
  onCommit: (text: string) => void
) {
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let stream: MediaStream | null = null;
  let recognition: any = null;
  let isRecording = false;
  let interimText = '';

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 1. Setup MediaRecorder for the final Groq submission
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };
    
    // 2. Setup Web Speech API for LIVE visual feedback only
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        if (!isRecording) return;
        let currentInterim = '';
        let finalSegment = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
             finalSegment += event.results[i][0].transcript + ' ';
          } else {
             currentInterim += event.results[i][0].transcript;
          }
        }
        interimText += finalSegment;
        onUpdate(interimText + currentInterim);
      };
      
      recognition.onerror = (event: any) => console.log("Speech recognition error:", event.error);
    } else {
      console.warn("Web Speech API not supported in this browser. Live visual transcript disabled.");
    }

    return {
      start: () => {
        isRecording = true;
        interimText = '';
        audioChunks = [];
        mediaRecorder?.start();
        try { recognition?.start(); } catch(e) {} // ignore if already started
      },
      stop: (): Promise<string> => {
        return new Promise((resolve) => {
          isRecording = false;
          try { recognition?.stop(); } catch(e) {}
          
          if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            if (stream) stream.getTracks().forEach(track => track.stop());
            resolve(interimText);
            return;
          }

          // When the recorder stops, send the audio to Groq
          mediaRecorder.onstop = async () => {
            if (audioChunks.length === 0) {
              if (stream) stream.getTracks().forEach(track => track.stop());
              resolve(interimText);
              return;
            }
            
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', audioBlob);
            
            try {
              const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
              const data = await res.json();
              if (data.text) {
                // Fire onCommit with the PERFECT Groq transcript!
                onCommit(data.text);
                resolve(data.text);
              } else if (data.error) {
                console.error("Groq transcribe returned error:", data.error);
                // Fallback to Web Speech API text if Groq fails
                onCommit(interimText); 
                resolve(interimText);
              } else {
                resolve(interimText);
              }
            } catch (err) {
               console.error("Groq transcribe fetch error", err);
               onCommit(interimText);
               resolve(interimText);
            } finally {
               if (stream) stream.getTracks().forEach(track => track.stop());
            }
          };

          mediaRecorder.stop();
        });
      }
    };
  } catch (err) {
    console.error("Failed to setup STT", err);
    throw err;
  }
}
