'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, Square, Volume2, VolumeX, Flag, Loader2,
  PanelRightClose, PanelRightOpen, Eye, User, Sparkles, AlertCircle, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore, getVoiceForJudge, type Judge } from '@/lib/store';
import { initVoiceEngine, generateTTS, playAudioData, stopAudioPlayback, createSTT, isEngineLoaded, unlockAudio } from '@/lib/voice-engine';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

const getEmojiForType = (type: string) => {
  switch (type) {
    case 'investor': return '💼';
    case 'professor': return '👩‍🏫';
    case 'hackathon_judge': return '🚀';
    case 'customer': return '🛒';
    case 'executive': return '👔';
    case 'student': return '🎓';
    case 'tech_lead': return '💻';
    case 'recruiter': return '🤝';
    default: return '👤';
  }
};

export default function QNASection() {
  const router = useRouter();
  const {
    sessionId, judges, transcript, addTranscript,
    isScoring, setIsScoring, setScores, setFeedback,
    setWeaknesses, setRecommendations, setKnowledgeGaps, setJudgeFeedback, setStep,
    practiceMode, updateCameraFrame, cameraMetrics, reset, recordSession
  } = useAppStore();
  const { user } = useAuth();

  const isInterview = practiceMode === 'interview';

  // UI Toggles
  const [isRecording, setIsRecording] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  // States for Meeting Panel
  const [currentJudgeIndex, setCurrentJudgeIndex] = useState(0);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [currentSpokenText, setCurrentSpokenText] = useState('');
  const [visibleCaptionText, setVisibleCaptionText] = useState('');
  const captionIntervalRef = useRef<any>(null);

  // Refs for audio stream control & cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const audioQueueRef = useRef<Array<{ blob: Blob; text: string }>>([]);
  const isPlayingQueueRef = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsPendingCountRef = useRef(0);
  const streamFinishedRef = useRef(false);
  const isInterruptedRef = useRef(false);

  // Video / Canvas References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [camStream, setCamStream] = useState<MediaStream | null>(null);

  // VAD & Engine refs
  const hasStartedRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);
  const [moonshineTranscriber, setMoonshineTranscriber] = useState<any>(null);

  const startRecordingRef = useRef<((...args: any[]) => void) | undefined>(undefined);
  const stopRecordingRef = useRef<((...args: any[]) => void) | undefined>(undefined);

  // Which judge is active
  const currentJudge = judges[currentJudgeIndex % judges.length] || judges[0] || { id: 'investor', icon: '💰', title: 'Investor', type: 'investor' };

  // Voice Activity Detection (VAD) silence detection
  useEffect(() => {
    if (isRecording && liveTranscript) {
      const timer = setTimeout(() => {
        if (isRecording && !isProcessingAudio) {
          stopRecordingRef.current?.();
        }
      }, 1500); // 1.5s of silence = turn end (faster for natural feel)
      return () => clearTimeout(timer);
    }
  }, [liveTranscript, isRecording, isProcessingAudio]);

  // Init voice engine & pre-unlock
  useEffect(() => {
    initVoiceEngine();
    unlockAudio();
    return () => {
      clearAudioQueue();
      stopCamera();
      abortControllerRef.current?.abort();
    };
  }, []);

  // Auto-scroll transcript log
  useEffect(() => {
    if (showSidebar) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, liveTranscript, showSidebar]);

  // Audio queue helper
  const clearAudioQueue = () => {
    isInterruptedRef.current = true;
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      } catch {}
      activeAudioRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingQueueRef.current = false;
    setIsPlayingTTS(false);
    setCurrentSpokenText('');
    setVisibleCaptionText('');
    if (captionIntervalRef.current) {
      clearInterval(captionIntervalRef.current);
      captionIntervalRef.current = null;
    }
  };

  const playQueue = async () => {
    if (isPlayingQueueRef.current || audioQueueRef.current.length === 0) return;
    isPlayingQueueRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const item = audioQueueRef.current.shift();
      if (!item) continue;

      const url = URL.createObjectURL(item.blob);
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      setIsPlayingTTS(true);
      setCurrentSpokenText(item.text);
      setVisibleCaptionText('');

      if (captionIntervalRef.current) {
        clearInterval(captionIntervalRef.current);
      }

      const words = item.text.split(/\s+/).filter(Boolean);
      const fallbackDuration = words.length * 350; // 350ms per word

      audio.ontimeupdate = () => {
        let d = audio.duration;
        if (!d || d === Infinity || isNaN(d)) {
          d = fallbackDuration / 1000;
        }
        const progress = Math.min(1, audio.currentTime / d);
        const targetWordCount = Math.floor(progress * words.length);
        const wordsToShow = words.slice(0, targetWordCount + 1).join(' ');
        setVisibleCaptionText(wordsToShow);
      };

      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (captionIntervalRef.current) {
            clearInterval(captionIntervalRef.current);
            captionIntervalRef.current = null;
          }
          setVisibleCaptionText(item.text);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (captionIntervalRef.current) {
            clearInterval(captionIntervalRef.current);
            captionIntervalRef.current = null;
          }
          resolve();
        };
        audio.play().catch((err) => {
          console.warn('TTS playback blocked or failed:', err.message);
          URL.revokeObjectURL(url);
          if (captionIntervalRef.current) {
            clearInterval(captionIntervalRef.current);
            captionIntervalRef.current = null;
          }
          resolve();
        });
      });
    }

    setIsPlayingTTS(false);
    activeAudioRef.current = null;
    isPlayingQueueRef.current = false;
    setCurrentSpokenText('');

    // Start recording user's response once AI finishes speaking
    if (streamFinishedRef.current && ttsPendingCountRef.current === 0 && !isInterruptedRef.current) {
      startRecordingRef.current?.();
    }
  };

  const fetchTTSForSentence = async (text: string, voiceId: string) => {
    if (!ttsEnabled) return;
    ttsPendingCountRef.current++;
    try {
      const res = await authenticatedFetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId })
      });
      if (res.ok) {
        const blob = await res.blob();
        audioQueueRef.current.push({ blob, text });
        playQueue();
      }
    } catch (err) {
      console.error('Failed to generate sentence TTS:', err);
    } finally {
      ttsPendingCountRef.current--;
    }
  };

  const processStream = async (response: Response, judgeType: string) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedResponse = '';
    const voiceId = getVoiceForJudge(judgeType);

    streamFinishedRef.current = false;
    isInterruptedRef.current = false;

    const targetIndex = useAppStore.getState().transcript.length;
    addTranscript('judge', '', judgeType);
    setStreamingMessageIndex(targetIndex);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        accumulatedResponse += chunk;

        // Update active message in Zustand transcript
        useAppStore.setState((state) => {
          const next = [...state.transcript];
          if (next[targetIndex]) {
            next[targetIndex] = { ...next[targetIndex], content: accumulatedResponse };
          }
          return { transcript: next };
        });

        // Parse buffer into sentences
        let sentenceEndIndex = -1;
        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];
          if (char === '.' || char === '?' || char === '!') {
            if (i === buffer.length - 1 || /\s/.test(buffer[i + 1])) {
              sentenceEndIndex = i;
              const sentence = buffer.slice(0, sentenceEndIndex + 1).trim();
              buffer = buffer.slice(sentenceEndIndex + 1);
              i = -1; // restart search on remaining buffer

              if (sentence.length > 5) {
                fetchTTSForSentence(sentence, voiceId);
              }
            }
          }
        }
      }

      if (buffer.trim().length > 0) {
        fetchTTSForSentence(buffer.trim(), voiceId);
      }

      streamFinishedRef.current = true;

      // Start recording fallback if queue is empty immediately
      setTimeout(() => {
        if (audioQueueRef.current.length === 0 && !isPlayingQueueRef.current && ttsPendingCountRef.current === 0) {
          if (!isInterruptedRef.current) {
            startRecordingRef.current?.();
          }
        }
      }, 600);

    } catch (err) {
      console.error('Error parsing response stream:', err);
    }
  };

  const rotateJudge = useCallback(() => {
    if (judges.length > 1) {
      setCurrentJudgeIndex((prev) => (prev + 1) % judges.length);
    }
  }, [judges.length]);

  const sendUserMessage = useCallback(async (text: string, judgeType: string, judgeTitle: string) => {
    if (!text.trim() || !sessionId) return;

    addTranscript('presenter', text.trim());
    setIsAILoading(true);
    clearAudioQueue();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await authenticatedFetch('/api/multi-chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text.trim(), judgeType, judgeTitle }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error();
      setIsAILoading(false);

      await processStream(res, judgeType);
      rotateJudge();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Stream aborted.');
      } else {
        toast.error('Failed to get response');
        setIsAILoading(false);
      }
    }
  }, [sessionId, addTranscript, rotateJudge]);

  // Initial greeting triggers on load
  useEffect(() => {
    if (!hasStartedRef.current && sessionId && !isAILoading && judges.length > 0) {
      hasStartedRef.current = true;
      const firstJudge = judges[0];
      setIsAILoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const startQA = async () => {
        try {
          const res = await authenticatedFetch('/api/multi-chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              message: isInterview ? 'I am ready to begin the interview.' : 'I have finished my presentation. Please ask me your first question.',
              judgeType: firstJudge.type,
              judgeTitle: firstJudge.title,
            }),
            signal: controller.signal,
          });

          if (!res.ok) throw new Error();
          setIsAILoading(false);

          await processStream(res, firstJudge.type);
          rotateJudge();
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            console.log('Start aborted.');
          } else {
            toast.error('Failed to start session');
            setIsAILoading(false);
          }
        }
      };
      startQA();
    }
  }, [sessionId, isAILoading, judges, addTranscript, isInterview, rotateJudge]);

  // Webcam controls & metrics capture
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCamStream(stream);
      setIsCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error('Could not access webcam');
      setIsCameraOn(false);
    }
  };

  const stopCamera = () => {
    if (camStream) {
      camStream.getTracks().forEach((track) => track.stop());
      setCamStream(null);
    }
    setIsCameraOn(false);
  };

  // Periodic frame capture for VLM analysis
  useEffect(() => {
    if (!isCameraOn || !camStream) return;

    const captureFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0) return;

      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 320, 240);
      const base64 = canvas.toDataURL('image/jpeg', 0.7);

      try {
        const res = await authenticatedFetch('/api/analyze-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.eyeContact > 0 || data.posture > 0 || data.presence > 0) {
            updateCameraFrame(data.eyeContact, data.posture, data.presence);
          }
        }
      } catch {}
    };

    const intervalId = setInterval(captureFrame, 15000);
    return () => clearInterval(intervalId);
  }, [isCameraOn, camStream, updateCameraFrame]);

  // Recording management
  const startRecording = async () => {
    clearAudioQueue();
    setIsRecording(true);
    setLiveTranscript('');

    try {
      isInitializingRef.current = true;
      const transcriber = await createSTT(
        (text) => {
          setLiveTranscript(text);
        },
        () => {}
      );
      if (!isInitializingRef.current) {
        if (typeof transcriber.stop === 'function') transcriber.stop();
        return;
      }
      setMoonshineTranscriber(transcriber);
      if (typeof transcriber.start === 'function') transcriber.start();
    } catch {
      toast.error('Microphone failed to start');
      setIsRecording(false);
    } finally {
      isInitializingRef.current = false;
    }
  };

  const stopRecording = async () => {
    isInitializingRef.current = false;
    setIsRecording(false);

    if (moonshineTranscriber) {
      setIsProcessingAudio(true);
      let finalText = '';
      if (typeof moonshineTranscriber.stop === 'function') {
        finalText = await moonshineTranscriber.stop();
      }
      setIsProcessingAudio(false);
      setMoonshineTranscriber(null);

      const textToSend = finalText.trim() || liveTranscript.trim();
      setLiveTranscript('');
      if (textToSend) {
        sendUserMessage(textToSend, currentJudge.type, currentJudge.title);
      }
    }
  };

  useEffect(() => {
    startRecordingRef.current = startRecording;
    stopRecordingRef.current = stopRecording;
  }, [startRecording, stopRecording]);

  const handleEndSession = async () => {
    if (!sessionId) return;
    clearAudioQueue();
    stopCamera();
    setIsScoring(true);

    // Stop global session recording and capture the audio blob (if enabled)
    let audioBlob: Blob | null = null;

    if (recordSession && typeof (window as any).stopSessionRecording === 'function') {
      try {
        audioBlob = await (window as any).stopSessionRecording();
      } catch (err) {
        console.error('Error stopping session audio recording:', err);
      }
    }

    try {
      const res = await authenticatedFetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          judges,
          cameraMetrics: cameraMetrics.frames > 0 ? cameraMetrics : undefined
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const s = data.score || data;

      // Upload recorded audio if available
      if (audioBlob) {
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          await authenticatedFetch(`/api/session/${sessionId}/audio`, {
            method: 'POST',
            body: formData,
          });
          console.log('Session audio uploaded successfully');
        } catch (uploadErr) {
          console.error('Failed to upload session audio:', uploadErr);
        }
      }

      setScores({
        clarity: s.clarity,
        confidence: s.confidence,
        technical: s.technical,
        storytelling: s.storytelling,
        persuasiveness: s.persuasiveness,
        conciseness: s.conciseness,
        verbatimReading: s.verbatimReading || 0,
        eyeContact: s.eyeContact || 0,
        posture: s.posture || 0,
        cameraPresence: s.cameraPresence || 0,
        overall: s.overall
      });
      setFeedback(s.feedback || '');
      setWeaknesses(s.weaknesses || []);
      setRecommendations(s.recommendations || []);
      setJudgeFeedback(s.judgeFeedback || []);
      setKnowledgeGaps(s.knowledgeGaps || []);

      setStep(isInterview ? 4 : 5);
    } catch {
      toast.error('Scoring failed');
    } finally {
      setIsScoring(false);
    }
  };

  return (
    <div className="h-full flex bg-[#0c0c0e] text-foreground relative overflow-hidden">
      {/* Boardroom main zone */}
      <div className="flex-1 flex flex-col min-w-0 h-full justify-between p-4 pb-20">
        
        {/* Top toolbar */}
        <div className="flex items-center justify-between border border-white/5 bg-black/60 rounded-xl px-4 py-2.5 backdrop-blur-md shrink-0 mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              {isInterview ? 'Interview Simulation Room' : 'Q&A Panel Room'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setTtsEnabled(!ttsEnabled);
                if (ttsEnabled) clearAudioQueue();
              }}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              title="Toggle Audio output"
            >
              {ttsEnabled ? <Volume2 className="size-3.5 text-primary" /> : <VolumeX className="size-3.5" />}
              <span className="text-[10px] hidden sm:inline">{ttsEnabled ? 'Sound On' : 'Muted'}</span>
            </button>
            <div className="h-4 w-px bg-white/10" />
            <button
              onClick={() => {
                if (confirm("Are you sure you want to end this practice session and return to the dashboard? All unsaved progress will be lost.")) {
                  clearAudioQueue();
                  stopCamera();
                  reset();
                  router.push('/dashboard');
                }
              }}
              className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors border border-red-500/20 hover:bg-red-500/10 rounded-md px-2.5 py-1"
            >
              <LogOut className="size-3" /> Exit Session
            </button>
          </div>
        </div>

        {/* Panel meeting grid */}
        <div className="flex-1 min-h-0 w-full flex items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl w-full max-h-[85%] overflow-y-auto p-1">
            {/* AI Judges */}
            {judges.map((judge, idx) => {
              const isActiveSpeaker = (isPlayingTTS || isAILoading) && (idx === currentJudgeIndex % judges.length);
              const isThinking = isAILoading && (idx === currentJudgeIndex % judges.length);

              return (
                <div
                  key={judge.id}
                  className={`relative rounded-2xl border bg-black/40 backdrop-blur-sm p-5 aspect-video flex flex-col justify-between items-center text-center transition-all duration-300 ${
                    isActiveSpeaker 
                      ? 'ring-2 ring-primary border-primary bg-black/60 shadow-lg shadow-primary/5' 
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Status Indicator Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 border border-white/10 px-2 py-0.5 rounded-full text-[9px] text-muted-foreground">
                    <span className={`size-1.5 rounded-full ${
                      isThinking ? 'bg-amber-400 animate-pulse' : isActiveSpeaker ? 'bg-primary animate-pulse' : 'bg-zinc-500'
                    }`} />
                    <span className="font-semibold capitalize">
                      {isThinking ? 'thinking...' : isActiveSpeaker ? 'speaking' : 'listening'}
                    </span>
                  </div>

                  {/* Visual wave for active speaker */}
                  {isActiveSpeaker && !isThinking && (
                    <div className="absolute top-3.5 right-4 flex items-end gap-1 h-4 px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-md">
                      <div className="w-0.5 h-full bg-primary rounded-full animate-[bounce_0.9s_infinite_both]" style={{ animationDelay: '0.1s' }} />
                      <div className="w-0.5 h-[60%] bg-primary rounded-full animate-[bounce_0.7s_infinite_both]" style={{ animationDelay: '0.3s' }} />
                      <div className="w-0.5 h-[80%] bg-primary rounded-full animate-[bounce_0.8s_infinite_both]" style={{ animationDelay: '0.2s' }} />
                      <div className="w-0.5 h-[40%] bg-primary rounded-full animate-[bounce_0.6s_infinite_both]" style={{ animationDelay: '0.5s' }} />
                      <div className="w-0.5 h-[70%] bg-primary rounded-full animate-[bounce_1s_infinite_both]" style={{ animationDelay: '0.4s' }} />
                    </div>
                  )}

                  <div className="my-auto flex flex-col items-center">
                    <div className="relative flex items-center justify-center size-16 rounded-full bg-[#16161a] border border-white/10 shadow-md mb-2.5">
                      <span className="text-3xl filter drop-shadow-md select-none">{getEmojiForType(judge.type)}</span>
                    </div>
                    <span className="text-sm font-semibold tracking-tight block text-foreground">{judge.title}</span>
                    <span className="text-[10px] text-muted-foreground block capitalize mt-0.5 font-medium">AI Panel Member</span>
                  </div>

                  <span className="text-[9px] text-muted-foreground bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-md mt-2">
                    Panel Member
                  </span>
                </div>
              );
            })}

            {/* Presenter / Self-View Card */}
            <div className={`relative rounded-2xl border bg-black/40 p-4 aspect-video flex flex-col justify-between items-center overflow-hidden transition-all ${
              isRecording ? 'border-primary bg-black/60 shadow-lg shadow-primary/5' : 'border-white/5'
            }`}>
              {/* Status Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 border border-white/10 px-2 py-0.5 rounded-full text-[9px] text-muted-foreground z-10">
                <span className={`size-1.5 rounded-full ${
                  isRecording ? 'bg-destructive animate-pulse' : 'bg-zinc-500'
                }`} />
                <span className="font-semibold">
                  {isRecording ? 'YOU (SPEAKING)' : 'YOU'}
                </span>
              </div>

              {/* Webcam view */}
              {isCameraOn ? (
                <div className="absolute inset-0 w-full h-full bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <div className="my-auto flex flex-col items-center">
                  <div className="relative flex items-center justify-center size-16 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/60 shadow-lg shadow-emerald-500/10 animate-pulse">
                    <span className="text-2xl filter drop-shadow-md select-none">👤</span>
                  </div>
                  <span className="text-xs font-bold text-foreground mt-3">{user?.displayName || 'You'}</span>
                  <span className="text-[10px] text-muted-foreground block font-medium mt-0.5">
                    {isInterview ? 'Candidate Host' : 'Presenter Host'}
                  </span>
                </div>
              )}

              {/* Speaker mic waveform */}
              {isRecording && (
                <div className="absolute bottom-3 right-3 flex items-end gap-1 h-3.5 z-10 bg-black/50 p-1.5 rounded-md border border-white/10">
                  <div className="w-0.5 h-full bg-destructive rounded-full animate-[bounce_0.8s_infinite]" />
                  <div className="w-0.5 h-[50%] bg-destructive rounded-full animate-[bounce_0.7s_infinite]" style={{ animationDelay: '0.15s' }} />
                  <div className="w-0.5 h-[80%] bg-destructive rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: '0.3s' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closed caption panel (overlay at bottom center) */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-20">
          <div className="bg-[#09090b]/95 border border-white/[0.08] backdrop-blur-xl px-5 py-3 rounded-xl shadow-2xl flex items-start gap-3.5 min-h-[52px]">
            {isRecording ? (
              <>
                <div className="size-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  👤
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-primary block uppercase tracking-wider">You (Responding)</span>
                  <p className="text-xs text-foreground leading-relaxed italic mt-0.5">
                    {liveTranscript || 'Listening... speak now.'}
                  </p>
                </div>
              </>
            ) : isPlayingTTS && currentSpokenText ? (
              <>
                <div className="size-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs shrink-0 mt-0.5">
                  🎤
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-primary block uppercase tracking-wider">
                    {currentJudge.title}
                  </span>
                  <p className="text-xs text-foreground leading-relaxed mt-0.5">
                    {visibleCaptionText}
                  </p>
                </div>
              </>
            ) : isAILoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground w-full py-1 justify-center">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>AI Panel is reviewing your response and preparing the next question...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground w-full py-1 justify-center">
                <Sparkles className="size-3.5 text-primary animate-pulse" />
                <span>Ready. Click the mic button below to speak.</span>
              </div>
            )}
          </div>
        </div>

        {/* Boardroom Bottom controls dock */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-[#0d0d0f] border border-white/5 shadow-2xl rounded-full px-5 py-2.5 z-30">
          <button
            onClick={() => {
              if (isRecording) stopRecordingRef.current?.();
              else startRecordingRef.current?.();
            }}
            disabled={isAILoading || isScoring || isProcessingAudio}
            className={`size-10 rounded-full flex items-center justify-center transition-colors border ${
              isRecording 
                ? 'bg-destructive border-destructive text-destructive-foreground hover:bg-destructive/90' 
                : 'bg-white border-zinc-700 text-black hover:bg-zinc-200'
            } disabled:opacity-30 disabled:cursor-not-allowed`}
            title={isRecording ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {isRecording ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          </button>

          <button
            onClick={() => {
              if (isCameraOn) stopCamera();
              else startCamera();
            }}
            disabled={isScoring}
            className={`size-10 rounded-full flex items-center justify-center transition-colors border ${
              isCameraOn 
                ? 'bg-zinc-800 border-zinc-700 text-foreground hover:bg-zinc-700' 
                : 'bg-zinc-900 border-zinc-800 text-muted-foreground hover:bg-zinc-800'
            }`}
            title={isCameraOn ? 'Turn Camera Off' : 'Turn Camera On'}
          >
            {isCameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </button>

          <div className="h-6 w-px bg-white/10" />

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`size-10 rounded-full flex items-center justify-center transition-colors border ${
              showSidebar 
                ? 'bg-zinc-800 border-zinc-700 text-foreground' 
                : 'bg-zinc-900 border-zinc-800 text-muted-foreground'
            }`}
            title="Toggle Meeting Notes"
          >
            {showSidebar ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
          </button>

          <Button
            size="sm"
            onClick={handleEndSession}
            disabled={isScoring || transcript.length < 1}
            className="rounded-full px-4 h-9 bg-destructive hover:bg-destructive/95 text-destructive-foreground font-semibold text-xs transition-colors flex items-center gap-1 shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            {isScoring ? (
              <><Loader2 className="size-3 animate-spin" /> scoring</>
            ) : (
              <><Square className="size-3 fill-current" /> leave room</>
            )}
          </Button>
        </div>
      </div>

      {/* Slide-out Sidebar for Transcript & Camera presence gauges */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-80 border-l border-white/5 bg-[#08080a] h-full flex flex-col shadow-2xl shrink-0 z-30"
          >
            {/* Sidebar header */}
            <div className="shrink-0 border-b border-white/5 px-4 py-3.5 flex items-center justify-between">
              <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Meeting Log & Analytics</span>
              <button
                onClick={() => setShowSidebar(false)}
                className="size-7 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors border border-white/5"
              >
                <PanelRightClose className="size-3.5" />
              </button>
            </div>

            {/* Live Metrics Widget */}
            {cameraMetrics.frames > 0 && (
              <div className="shrink-0 bg-black/45 border-b border-white/5 p-4 space-y-2">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest block">Webcam Presence Tracking</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/5 bg-[#050506] p-2 text-center">
                    <span className="text-lg font-bold text-primary tabular-nums block">{cameraMetrics.eyeContact}%</span>
                    <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider block">Eye Contact</span>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-[#050506] p-2 text-center">
                    <span className="text-lg font-bold text-primary tabular-nums block">{cameraMetrics.posture}%</span>
                    <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider block">Posture</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar transcript log list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                  <AlertCircle className="size-6 text-zinc-600 mb-2" />
                  <span className="text-[10px] leading-relaxed">No logs generated. Use the mic to answer questions.</span>
                </div>
              ) : (
                transcript.map((entry, idx) => {
                  const isJudge = entry.role === 'judge';
                  const judgeObj = isJudge ? judges.find(j => j.type === entry.judgeId) : null;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {isJudge ? `${judgeObj?.icon || '🎤'} ${judgeObj?.title || 'Audience'}` : '👤 You'}
                        </span>
                        <span className="text-[8px] text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground bg-white/5 border border-white/5 rounded-lg p-2.5 leading-relaxed whitespace-pre-wrap">
                        {entry.content || '...'}
                      </p>
                    </div>
                  );
                })
              )}
              <div ref={transcriptEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
