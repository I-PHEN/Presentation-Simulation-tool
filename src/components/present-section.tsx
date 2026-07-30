'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, ArrowRight, ArrowLeft, Loader2, ChevronLeft, ChevronRight,
  Volume2, MessageSquare, X, Maximize, Minimize, Gauge, AlertCircle,
  Video, VideoOff, Eye, User, Users, Sparkles, Monitor, MonitorOff,
  PanelLeftClose, PanelLeftOpen, GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore, practiceModeConfig, getVoiceForJudge, type InputMode } from '@/lib/store';
import { initVoiceEngine, generateTTS, playAudioData, createSTT, stopAudioPlayback, isEngineLoaded, unlockAudio, isAudioUnlocked } from '@/lib/voice-engine';
import { toast } from 'sonner';
import MasterGuiderHud from '@/components/master-guider-hud';

// ─── Filler word detection ───
const FILLER_WORDS = [
  'um', 'uh', 'like', 'basically', 'actually', 'literally', 'you know',
  'sort of', 'kind of', 'i mean', 'right', 'so yeah', 'and stuff',
  'or something', 'whatever', 'anyway', 'honestly', 'obviously',
];

function countFillerWords(text: string): { total: number; words: Array<{ word: string; count: number }> } {
  const lower = text.toLowerCase();
  const found: Record<string, number> = {};
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      found[filler] = matches.length;
    }
  }
  const words = Object.entries(found)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
  return { total: words.reduce((s, w) => s + w.count, 0), words };
}

function calcWPM(transcript: string, elapsedSec: number): number {
  if (elapsedSec < 10) return 0;
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((wordCount / elapsedSec) * 60);
}

// ─── Participant status types ───
type ParticipantStatus = 'listening' | 'speaking' | 'typing';

function getJudgeStatus(
  judgeId: string,
  aiSpeaking: boolean,
  interruptJudge: { id: string; icon: string; title: string; type: string } | null,
  isAILoading: boolean,
): ParticipantStatus {
  if (interruptJudge && interruptJudge.id === judgeId && aiSpeaking) return 'speaking';
  if (interruptJudge && interruptJudge.id === judgeId && isAILoading) return 'typing';
  if (aiSpeaking) return 'listening';
  return 'listening';
}

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

// ─── Main Component ───
export default function PresentSection() {
  const {
    sessionId, title, audienceType, judges, slides, currentSlide, nextSlide, prevSlide, totalSlides,
    interruptionMode, practiceMode, impromptuTopic, setImpromptuTopic,
    presentationTranscript, appendPresentationTranscript,
    wordsPerMinute, setWordsPerMinute, fillerWordCount, setFillerWordCount, fillerWords, setFillerWords,
    cameraMetrics, updateCameraFrame, screenContext, setScreenContext,
    inputMode, setStep, isScoring, audienceCount,
    activeHandRaised, setActiveHandRaised, judgeReactions, setJudgeReaction,
    coachPersona, presenterDirectives, explanationDepth, setExplanationDepth,
    customDirectivesChecklist, setCustomDirectivesChecklist,
  } = useAppStore();
  // ─── Recording state ───
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isRescueLoading, setIsRescueLoading] = useState(false);
  const [lastInterruptTime, setLastInterruptTime] = useState(0);
  const [interruptQuestion, setInterruptQuestion] = useState<string | null>(null);
  const [interruptJudge, setInterruptJudge] = useState<{ id: string; icon: string; title: string; type: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [slideAspect, setSlideAspect] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const previousSlideRef = useRef(currentSlide);

  // Initialize custom directives checklist from presenterDirectives prompt
  useEffect(() => {
    if (presenterDirectives && customDirectivesChecklist.length === 0) {
      const parts = presenterDirectives
        .split(/[.,;\n]+/)
        .map(p => p.trim())
        .filter(p => p.length > 5)
        .slice(0, 4);
      if (parts.length > 0) {
        setCustomDirectivesChecklist(
          parts.map((p, idx) => ({ id: `dir-${idx}`, label: p, completed: false }))
        );
      }
    }
  }, [presenterDirectives, customDirectivesChecklist.length, setCustomDirectivesChecklist]);

  // Coach Rescue Handler
  const handleCoachRescue = useCallback(async () => {
    setIsRescueLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a concise 15-second executive model pitch script for Slide ${currentSlide + 1} of presentation '${title}'. Focus on: ${presenterDirectives || 'clear delivery, ROI, and core takeaway'}.`,
          sessionId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const rescueText = data.text || data.response || "Here is how to pitch this slide: Lead with your core result, keep your pace steady, and state your primary takeaway clearly.";
        toast.success("Coach Rescue Script Ready!");
        const voiceId = coachPersona === 'sarah' ? 'a7a59115-2425-4192-844c-1e98ec7d6877' : '533b2990-5b82-45a4-b9f2-367776972ca6';
        playTTS(rescueText, voiceId);
      }
    } catch {
      toast.error("Failed to generate coach rescue script");
    } finally {
      setIsRescueLoading(false);
    }
  }, [currentSlide, title, presenterDirectives, sessionId, coachPersona, playTTS]);

  useEffect(() => {
    if (isRecording && previousSlideRef.current !== null && previousSlideRef.current !== currentSlide) {
      appendPresentationTranscript(`\n[Slide ${currentSlide + 1}]\n`);
    }
    previousSlideRef.current = currentSlide;
  }, [appendPresentationTranscript, currentSlide, isRecording]);

  // ─── Camera state ───
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // ─── Screen share state ───
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    return () => {
      if (pipWindowRef.current) pipWindowRef.current.close();
    };
  }, []);

  // ─── Draggable PiP state ───
  const [pipPos, setPipPos] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // ─── Sidebar state ───
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ─── AI voice-first state ───
  const [aiIntroPlayed, setAiIntroPlayed] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const [moonshineTranscriber, setMoonshineTranscriber] = useState<any>(null);

  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    initVoiceEngine();
    // Unlock audio on any user interaction as early as possible
    const unlock = () => {
      unlockAudio();
      setTimeout(() => setAudioBlocked(!isAudioUnlocked()), 200);
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);


  // ─── Back confirmation ───
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // ─── Refs ───
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const interruptCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraAnalysisRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenAnalysisRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);

  const hasSlides = slides.length > 0;
  const isImpromptu = practiceMode === 'impromptu';
  const isPitch = practiceMode === 'pitch';
  const config = practiceModeConfig[practiceMode];
  const timeLimit = config.timeLimit;
  const remaining = timeLimit ? Math.max(0, timeLimit - elapsed) : null;
  const isScreenMode = inputMode === 'screen';
  const isLecture = practiceMode === 'lecture';

  // ─── TTS playback helper ───
  const playTTS = useCallback(async (text: string, voice?: string) => {
    try {
      setTimeout(() => setAiSpeaking(true), 0);
      const audioResult = await generateTTS(text, voice || 'd46abd1d-2d02-43e8-819f-51fb652c1c61');
      await playAudioData(audioResult);
    } catch { /* TTS failed */ }
    finally { setTimeout(() => setAiSpeaking(false), 0); }
  }, []);

  // ─── Auto-Intro ───
  useEffect(() => {
    if (!aiIntroPlayed) {
      setTimeout(() => setAiIntroPlayed(true), 0);
      // Play pre-generated local MP3 for immediate playback with zero network latency
      const playInstantIntro = async () => {
        try {
          setTimeout(() => setAiSpeaking(true), 0);
          const res = await fetch('/intro.mp3');
          const blob = await res.blob();
          await playAudioData({ audio: blob });
        } catch (e) {
          console.error("Instant intro failed", e);
        } finally {
          setTimeout(() => setAiSpeaking(false), 0);
        }
      };
      playInstantIntro();
    }
  }, [aiIntroPlayed]);

  // ─── Camera toggle ───
  const toggleCamera = useCallback(async () => {
    if (isCameraOn) {
      cameraStream?.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
      setIsCameraOn(false);
      if (videoRef.current) videoRef.current.srcObject = null;
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        });
        setCameraStream(stream);
        setIsCameraOn(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }, 100);
      } catch {
        toast.error('Camera access denied. You can still present without camera.');
      }
    }
  }, [isCameraOn, cameraStream]);

  // ─── Screen share toggle ───
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      if (pipWindowRef.current) pipWindowRef.current.close();
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });

        if ('documentPictureInPicture' in window) {
          try {
            const pip = await (window as any).documentPictureInPicture.requestWindow({
              width: 500,
              height: 350,
            });
            pip.document.body.style.margin = '0';
            pip.document.body.style.padding = '0';
            pip.document.body.style.overflow = 'hidden';
            [...document.styleSheets].forEach((styleSheet) => {
              try {
                const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                const style = document.createElement('style');
                style.textContent = cssRules;
                pip.document.head.appendChild(style);
              } catch (e) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.type = styleSheet.type;
                link.media = styleSheet.media.mediaText;
                if (styleSheet.href) link.href = styleSheet.href;
                pip.document.head.appendChild(link);
              }
            });
            pip.addEventListener('pagehide', () => {
              setPipWindow(null);
              pipWindowRef.current = null;
              stream.getTracks().forEach((t: any) => t.stop());
            });
            setPipWindow(pip);
            pipWindowRef.current = pip;
          } catch (e) {
            console.error("PiP failed", e);
          }
        }

        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          setScreenStream(null);
          setIsScreenSharing(false);
          if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
          if (pipWindowRef.current) pipWindowRef.current.close();
        });
        setScreenStream(stream);
        setIsScreenSharing(true);
        setTimeout(() => {
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = stream;
          }
        }, 100);
      } catch {
        toast.error('Screen share was cancelled or denied.');
      }
    }
  }, [isScreenSharing, screenStream]);

  // ─── Camera frame analysis (every 15s while recording + camera on) ───
  useEffect(() => {
    if (!isCameraOn || !isRecording) {
      if (cameraAnalysisRef.current) {
        clearInterval(cameraAnalysisRef.current);
        cameraAnalysisRef.current = null;
      }
      return;
    }

    const doAnalysis = async () => {
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
        const res = await fetch('/api/analyze-frame', {
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
      } catch { /* silent */ }
    };

    const timeout = setTimeout(() => {
      doAnalysis();
      cameraAnalysisRef.current = setInterval(doAnalysis, 15000);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      if (cameraAnalysisRef.current) {
        clearInterval(cameraAnalysisRef.current);
        cameraAnalysisRef.current = null;
      }
    };
  }, [isCameraOn, isRecording, updateCameraFrame]);

  // ─── Screen frame analysis (every 20s while screen sharing + recording) ───
  useEffect(() => {
    if (!isScreenSharing || !isRecording) {
      if (screenAnalysisRef.current) {
        clearInterval(screenAnalysisRef.current);
        screenAnalysisRef.current = null;
      }
      return;
    }

    const doAnalysis = async () => {
      if (!screenVideoRef.current || !screenCanvasRef.current) return;
      const video = screenVideoRef.current;
      const canvas = screenCanvasRef.current;
      if (video.videoWidth === 0) return;

      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 640, 360);
      const base64 = canvas.toDataURL('image/jpeg', 0.7);

      try {
        const res = await fetch('/api/analyze-screen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.description) {
            setScreenContext(data.description);
            appendPresentationTranscript('\\n[Visual Context Update: ' + data.description + ']\\n');
          }
        }
      } catch { /* silent */ }
    };

    const timeout = setTimeout(() => {
      doAnalysis();
      screenAnalysisRef.current = setInterval(doAnalysis, 20000);
    }, 8000);

    return () => {
      clearTimeout(timeout);
      if (screenAnalysisRef.current) {
        clearInterval(screenAnalysisRef.current);
        screenAnalysisRef.current = null;
      }
    };
  }, [isScreenSharing, isRecording, setScreenContext]);



  // ─── Fetch impromptu topic ───
  useEffect(() => {
    if (isImpromptu && !impromptuTopic) {
      fetch('/api/impromptu-topic')
        .then(r => r.json())
        .then(data => setImpromptuTopic(data.topic))
        .catch(() => setImpromptuTopic('Why constraints make you more creative'));
    }
  }, [isImpromptu, impromptuTopic, setImpromptuTopic]);

  // ─── Detect slide aspect ratio ───
  useEffect(() => {
    if (!hasSlides) return;
    const img = new Image();
    img.onload = () => setSlideAspect(img.naturalWidth / img.naturalHeight);
    img.src = slides[0];
  }, [slides, hasSlides]);

  // ─── Timer + countdown ───
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 1;
          if (timeLimit && next >= timeLimit) {
            setTimeUp(true);
          }
          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording, timeLimit]);

  // ─── Update WPM and filler words ───
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      const wpm = calcWPM(presentationTranscript, elapsed);
      setWordsPerMinute(wpm);
      const fillerResult = countFillerWords(presentationTranscript);
      setFillerWordCount(fillerResult.total);
      setFillerWords(fillerResult.words.slice(0, 5));
    }, 5000);
    return () => clearInterval(interval);
  }, [isRecording, presentationTranscript, elapsed, setWordsPerMinute, setFillerWordCount, setFillerWords]);

  // ─── Auto-scroll transcript ───
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [presentationTranscript]);

  // ─── Fullscreen toggle ───
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ─── Keyboard navigation ───
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { prevSlide(); }
      else if (e.key === 'ArrowRight') { nextSlide(); }
      else if (e.key === 'Escape' && isFullscreen) { toggleFullscreen(); }
      else if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }
      else if (e.key === 't' || e.key === 'T') { setShowTranscript(prev => !prev); }
      else if (e.key === 'p' || e.key === 'P') { setSidebarOpen(prev => !prev); }
      else if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault();
        setShowBackConfirm(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prevSlide, nextSlide, isFullscreen, toggleFullscreen]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const isPortrait = slideAspect !== null && slideAspect < 1;

  // ─── Draggable PiP handlers ───
  const handlePipMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    const pipEl = (e.currentTarget as HTMLElement).parentElement;
    if (!pipEl) return;
    const rect = pipEl.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pipW = 180;
      const pipH = 140;
      const container = mainAreaRef.current;
      const bounds = container ? container.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
      const newX = Math.max(0, Math.min(bounds.width - pipW, e.clientX - bounds.left - dragOffset.current.x));
      const newY = Math.max(0, Math.min(bounds.height - pipH, e.clientY - bounds.top - dragOffset.current.y));
      setPipPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // ─── Transcription ───
  // Replaced by Moonshine VAD hooks below

  // ─── Live Reaction Polling ───
  const checkForInterruption = useCallback(async () => {
    if (!sessionId || !presentationTranscript.trim()) return;

    try {
      const res = await fetch('/api/live-reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: presentationTranscript.slice(-1000), // Only send recent chunk
          judges,
          activeHandRaised
        }),
      });
      if (!res.ok) return;
      
      const data = await res.json();
      
      // If a hand is raised and speaker allowed it
      if (activeHandRaised && data.speakerAllowed) {
        // Find the judge
        const judge = judges.find(j => j.id === activeHandRaised);
        if (judge) {
          setIsAILoading(true);
          // Auto-allow
          const qRes = await fetch('/api/multi-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              message: '__interruption_check__\n\nRecent transcript: ' + presentationTranscript.slice(-500),
              judgeType: judge.type,
              screenContext: screenContext.description || undefined,
            }),
          });
          setIsAILoading(false);
          
          if (qRes.ok) {
            const qData = await qRes.json();
            const response = qData.response || qData.message;
            if (response && response.length > 10) {
              setInterruptQuestion(response);
              setInterruptJudge(judge);
              const voice = getVoiceForJudge(judge.type);
              playTTS(response, voice);
            }
          }
        }
        setActiveHandRaised(null); // hand lowered
        return;
      }
      
      // Handle new action
      if (data.action === 'raise_hand' && data.judgeId && !activeHandRaised) {
        setActiveHandRaised(data.judgeId);
        setSidebarOpen(true);
      } else if (data.action === 'nodding' || data.action === 'thinking') {
        if (data.judgeId) {
          setJudgeReaction(data.judgeId, data.action);
          setTimeout(() => setJudgeReaction(data.judgeId, 'none'), 4000);
        }
      }
    } catch { /* silent */ }
  }, [sessionId, presentationTranscript, judges, activeHandRaised, playTTS, screenContext, setActiveHandRaised, setJudgeReaction, setSidebarOpen]);

  // ─── Start recording ───
  const startRecording = async () => {
    try {
      if (!presentationTranscript.trim()) {
        appendPresentationTranscript(`[Slide ${currentSlide + 1}]\n`);
      }
      if (!moonshineTranscriber) {
        if (!isEngineLoaded()) {
          toast.info('Initializing voice models... this may take a moment the first time.');
        }
        const transcriber = await createSTT(
          (text) => { /* partial update */ },
          (text) => {
            if (text.trim()) {
              appendPresentationTranscript(text.trim() + ' ');
            }
          }
        );
        setMoonshineTranscriber(transcriber);
        if (typeof transcriber.start === 'function') transcriber.start();
      } else {
        if (typeof moonshineTranscriber.start === 'function') moonshineTranscriber.start();
      }

      setIsRecording(true);
      setTimeUp(false);
      setLastInterruptTime(Date.now());

      if (interruptionMode === 'during') {
        interruptCheckRef.current = setInterval(() => checkForInterruption(), 15000); // 15s poller
      }
    } catch {
      toast.error('Microphone access denied or model failed to load');
    }
  };

  // ─── Stop recording ───
  const stopRecording = useCallback(async () => {
    if (!isRecording) return '';
    
    let finalText = '';
    if (moonshineTranscriber && typeof moonshineTranscriber.stop === 'function') {
      finalText = await moonshineTranscriber.stop();
    }
    
    setMoonshineTranscriber(null); // Force re-init on next tap to prevent InvalidStateError
    
    if (interruptCheckRef.current) { clearInterval(interruptCheckRef.current); interruptCheckRef.current = null; }
    if (cameraAnalysisRef.current) { clearInterval(cameraAnalysisRef.current); cameraAnalysisRef.current = null; }
    if (screenAnalysisRef.current) { clearInterval(screenAnalysisRef.current); screenAnalysisRef.current = null; }

    setIsRecording(false);
    return finalText;
  }, [isRecording, moonshineTranscriber]);

  // ─── Handle Done ───
  const handleDone = async () => {
    if (isProcessing || isScoring) return;
    setIsProcessing(true);
    let finalTranscript = presentationTranscript;
    if (isRecording) {
      const extraText = await stopRecording();
      if (extraText) finalTranscript += ' ' + extraText;
    }
    if (!sessionId) { toast.error('Session not found'); setIsProcessing(false); return; }

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: `__presentation_transcript__${finalTranscript}` }),
      });
    } catch { /* continue */ }

    if (interruptionMode === 'during') {
      useAppStore.getState().setIsScoring(true);
      try {
        const res = await fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            judges,
            cameraMetrics: cameraMetrics.frames > 0 ? cameraMetrics : undefined,
            screenContext: screenContext.description || undefined,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const s = data.score || data;
        useAppStore.getState().setScores({
          clarity: s.clarity, confidence: s.confidence, technical: s.technical,
          storytelling: s.storytelling, persuasiveness: s.persuasiveness,
          conciseness: s.conciseness, verbatimReading: s.verbatimReading || 0,
          eyeContact: s.eyeContact || 0, posture: s.posture || 0,
          cameraPresence: s.cameraPresence || 0,
          overall: s.overall,
        });
        useAppStore.getState().setFeedback(s.feedback || '');
        useAppStore.getState().setWeaknesses(s.weaknesses || []);
        useAppStore.getState().setRecommendations(s.recommendations || []);
        useAppStore.getState().setJudgeFeedback(s.judgeFeedback || []);
        useAppStore.getState().setKnowledgeGaps(s.knowledgeGaps || []);
        if (document.fullscreenElement) await document.exitFullscreen();
        setStep(5);
      } catch {
        toast.error('Scoring failed');
        useAppStore.getState().setIsScoring(false);
        setIsProcessing(false);
      }
    } else {
      if (document.fullscreenElement) await document.exitFullscreen();
      setStep(4);
    }
  };

  // ─── Unmount cleanup ───
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      if (screenStream) screenStream.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStream, screenStream]);

  const dismissInterrupt = () => { setInterruptQuestion(null); setInterruptJudge(null); };

  // ─── Derived values ───
  const paceLabel = wordsPerMinute === 0 ? '' : wordsPerMinute < 100 ? 'Slow' : wordsPerMinute > 180 ? 'Fast' : 'Good';
  const paceColor = wordsPerMinute === 0 ? 'text-muted-foreground' : wordsPerMinute < 100 ? 'text-yellow-400' : wordsPerMinute > 180 ? 'text-red-400' : 'text-success';
  const cameraScoreColor = (s: number) => s >= 70 ? 'text-success' : s >= 40 ? 'text-yellow-400' : s > 0 ? 'text-red-400' : 'text-muted-foreground';

  // Determine main content mode
  const showSlides = !isScreenMode && hasSlides && !isImpromptu;

  // ─── RENDER ───
  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col relative bg-black"
    >
      {/* Hidden canvases for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
      <canvas ref={screenCanvasRef} className="hidden" />

      {/* ═══════════════════════════════════════════ */}
      {/* BACKGROUND & BODY                           */}
      {/* ═══════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden bg-surface">

        {/* ═══════════════════════════════════════════ */}
        {/* PARTICIPANT SIDEBAR (Left)                 */}
        {/* ═══════════════════════════════════════════ */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full bg-[#0a0a0c] border-r border-border/60 flex flex-col shrink-0 overflow-hidden z-10"
            >
              {/* Sidebar header */}
              <div className="flex items-center justify-between px-2 py-2 border-b border-border/40">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest ml-1">
                  {isLecture ? 'Students' : 'Participants'} ({audienceCount})
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Close sidebar"
                >
                  <PanelLeftClose className="size-3.5" />
                </button>
              </div>

              {/* Judge list */}
              <div className="flex-1 overflow-y-auto py-1">
                {judges.map((judge) => {
                  const status = getJudgeStatus(judge.id, aiSpeaking, interruptJudge, isAILoading);
                  const isHandRaised = activeHandRaised === judge.id;
                  const reaction = judgeReactions[judge.id];
                  
                  return (
                    <div
                      key={judge.id}
                      className={`flex flex-col gap-2 p-2 mx-1 my-1 rounded-md transition-colors ${
                        interruptJudge?.id === judge.id ? 'bg-violet-500/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative shrink-0">
                          <div className="size-7 rounded-full flex items-center justify-center text-xs bg-[#16161a] border border-white/10 shadow-sm">
                            {getEmojiForType(judge.type)}
                          </div>
                          {status === 'speaking' ? (
                            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0c] animate-pulse" />
                          ) : status === 'typing' ? (
                            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-yellow-400 ring-2 ring-[#0a0a0c]" />
                          ) : (
                            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-zinc-600 ring-2 ring-[#0a0a0c]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[11px] text-foreground font-medium truncate">{judge.title}</p>
                            {reaction === 'nodding' && <span className="text-xs animate-bounce">🤔</span>}
                            {reaction === 'thinking' && <span className="text-xs animate-pulse">🧐</span>}
                          </div>
                          <p className="text-[9px] text-muted-foreground capitalize">
                            {status === 'speaking' ? 'Speaking...' : status === 'typing' ? 'Thinking...' : 'Listening'}
                          </p>
                        </div>
                        {status === 'speaking' && (
                          <Volume2 className="size-3 text-success shrink-0 animate-pulse" />
                        )}
                      </div>

                      {/* Hand Raised UI inside collapsible sidebar */}
                      {isHandRaised && (
                        <div className="pt-2 border-t border-border/40">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-sm animate-bounce">✋</span>
                            <span className="text-[10px] font-semibold text-amber-400">Question!</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 h-6 text-[9px] hover:bg-success/20 hover:text-success border-success/30 px-1 font-semibold"
                              onClick={() => {
                                setJudgeReaction(judge.id, 'none');
                                setActiveHandRaised(null);
                                appendPresentationTranscript(" Yes, what is your question? ");
                              }}
                            >
                              👍 Allow
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 h-6 text-[9px] hover:bg-destructive/20 hover:text-destructive border-destructive/30 px-1 font-semibold"
                              onClick={() => {
                                setJudgeReaction(judge.id, 'none');
                                setActiveHandRaised(null);
                              }}
                            >
                              👎 Decline
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Placeholder audience entries */}
                {audienceCount > judges.length && Array.from({ length: audienceCount - judges.length }, (_, i) => (
                  <div key={`audience-${i}`} className="flex items-center gap-2 px-2 py-2 mx-1 rounded-md">
                    <div className="size-7 rounded-full flex items-center justify-center bg-muted/40 border border-border/30">
                      <Users className="size-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground font-medium truncate">
                        {isLecture ? `Student ${judges.length + i + 1}` : `Audience ${judges.length + i + 1}`}
                      </p>
                      <p className="text-[9px] text-zinc-700">Listening</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar footer info */}
              <div className="px-3 py-3 border-t border-border/40 flex flex-col gap-2 min-h-[88px] justify-end">
                {isCameraOn && isRecording && (
                  <div className={`flex items-center gap-3 text-[10px] transition-opacity duration-500 ${cameraMetrics.frames > 0 ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="flex items-center gap-1">
                      <Eye className={`size-2.5 ${cameraScoreColor(cameraMetrics.eyeContact)}`} />
                      <span className={`font-mono ${cameraScoreColor(cameraMetrics.eyeContact)}`}>{cameraMetrics.eyeContact}%</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className={`size-2.5 ${cameraScoreColor(cameraMetrics.posture)}`} />
                      <span className={`font-mono ${cameraScoreColor(cameraMetrics.posture)}`}>{cameraMetrics.posture}%</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className={`size-2.5 ${cameraScoreColor(cameraMetrics.presence)}`} />
                      <span className={`font-mono ${cameraScoreColor(cameraMetrics.presence)}`}>{cameraMetrics.presence}%</span>
                    </span>
                  </div>
                )}
                {isScreenSharing && (
                  <p className={`text-[9px] text-muted-foreground leading-tight transition-opacity duration-500 min-h-[14px] ${screenContext.description ? 'opacity-100' : 'opacity-0'}`} title={screenContext.description}>
                    Screen: {screenContext.description.slice(0, 60)}{screenContext.description.length > 60 ? '...' : ''}
                  </p>
                )}
                {isRecording && (
                  <div className={`flex items-center gap-2 text-[10px] transition-opacity duration-500 min-h-[14px] ${wordsPerMinute > 0 ? 'opacity-100' : 'opacity-0'}`}>
                    <Gauge className={`size-2.5 ${paceColor}`} />
                    <span className={`font-mono ${paceColor}`}>{wordsPerMinute} wpm</span>
                    {paceLabel && <span className={`text-[9px] ${paceColor}`}>({paceLabel})</span>}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ═══════════════════════════════════════════ */}
        {/* MAIN CONTENT AREA                          */}
        {/* ═══════════════════════════════════════════ */}
        <div ref={mainAreaRef} className="flex-1 min-w-0 min-h-0 flex flex-col relative overflow-hidden bg-zinc-950">

          {/* ─── Screen Share View (fills main area) ─── */}
          {isScreenSharing ? (
            <div className="flex-1 min-h-0 flex items-center justify-center relative bg-zinc-950 p-8">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="hidden" // We hide it because the user cannot interact with a video stream
              />
              <div className="text-center space-y-6 max-w-lg mx-auto bg-[#141416] border border-border/50 rounded-2xl p-8 shadow-2xl">
                <div className="size-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(var(--primary),0.2)]">
                  <Monitor className="size-10 text-primary animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Screen Sharing Active</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    You are sharing your screen with the AI judges. <br/><br/>
                    <strong className="text-foreground">Please navigate to the window you are sharing (e.g., PowerPoint or Excel) to scroll and interact with your presentation.</strong>
                  </p>
                </div>
                {pipWindow && (
                  <Button 
                    variant="destructive" 
                    onClick={() => pipWindowRef.current?.close()} 
                    className="w-full sm:w-auto mt-4 font-semibold shadow-lg shadow-destructive/20"
                  >
                    <Square className="size-4 mr-2" />
                    Stop Sharing
                  </Button>
                )}
              </div>
            </div>
          ) : isScreenMode && !isScreenSharing ? (
            /* ─── Screen Share Prompt (not yet sharing) ─── */
            <div className="flex-1 min-h-0 flex items-center justify-center relative bg-zinc-950">
              {/* If slides exist, show them behind the prompt */}
              {hasSlides && !isImpromptu ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    {isPortrait ? (
                      <img
                        key={currentSlide}
                        src={slides[currentSlide]}
                        alt={`Slide ${currentSlide + 1}`}
                        className="w-auto h-full object-contain"
                        style={{ maxHeight: '100%', maxWidth: '100%' }}
                        draggable={false}
                      />
                    ) : (
                      <img
                        key={currentSlide}
                        src={slides[currentSlide]}
                        alt={`Slide ${currentSlide + 1}`}
                        className="max-w-full max-h-full object-contain"
                        draggable={false}
                      />
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} disabled={currentSlide === 0} className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer disabled:cursor-default" aria-label="Previous slide" />
                  <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} disabled={currentSlide >= totalSlides - 1} className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer disabled:cursor-default" aria-label="Next slide" />
                </>
              ) : null}
              {/* Prompt overlay */}
              <div className="relative z-10 flex flex-col items-center gap-4 bg-[#0a0a0c]/90 backdrop-blur-sm rounded-2xl p-8 border border-border/60 max-w-md mx-4">
                <div className="size-14 rounded-2xl bg-emerald-400/10 flex items-center justify-center">
                  <Monitor className="size-7 text-success/70" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Share your screen</h2>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  Click the button below to start sharing your screen with the AI audience
                </p>
                <Button
                  onClick={toggleScreenShare}
                  className="rounded-xl px-6 bg-emerald-500 hover:bg-emerald-400 text-primary-foreground font-semibold"
                >
                  <Monitor className="size-4 mr-2" />
                  Share Screen
                </Button>
              </div>
            </div>
          ) : showSlides ? (
            /* ─── Slide Viewer ─── */
            <div className="flex-1 min-h-0 relative overflow-y-auto">
              <div className="flex justify-center w-full min-h-full py-4 px-2">
                <img
                  key={currentSlide}
                  src={slides[currentSlide]}
                  alt={`Slide ${currentSlide + 1}`}
                  className="w-full max-w-[800px] h-auto my-auto object-contain shadow-2xl border border-border/10 bg-white"
                  draggable={false}
                />
              </div>
              {/* Click zones */}
              <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} disabled={currentSlide === 0} className="absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer disabled:cursor-default" aria-label="Previous slide" />
              <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} disabled={currentSlide >= totalSlides - 1} className="absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer disabled:cursor-default" aria-label="Next slide" />
            </div>
          ) : (
            /* ─── Voice-Only / Impromptu View ─── */
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 relative">
              {isImpromptu ? (
                <div className="text-center max-w-lg">
                  <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl">🎯</span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-3">Impromptu Topic</h2>
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                    <p className="text-base text-foreground leading-relaxed font-medium">
                      &ldquo;{impromptuTopic || 'Loading topic...'}&rdquo;
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Take a moment to think, then present your stance. You have 2 minutes.
                  </p>
                </div>
              ) : (
                <>
                  <div className="size-20 rounded-full bg-muted/80 border border-border flex items-center justify-center mb-4">
                    <Mic className="size-8 text-primary/50" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Ready to Present?</h2>
                  <p className="text-sm text-muted-foreground max-w-sm text-center leading-relaxed">
                    Tap the microphone in the toolbar and start presenting. Your AI audience is listening.
                  </p>
                </>
              )}

              {/* Stats bar for voice-only */}
              {isRecording && (
                <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Gauge className={`size-3.5 ${paceColor}`} />
                    <span className={`text-xs font-mono font-medium ${paceColor}`}>{wordsPerMinute || '--'} wpm</span>
                    {paceLabel && <span className={`text-[10px] ${paceColor}`}>({paceLabel})</span>}
                  </div>
                  {fillerWordCount > 0 && (
                    <div className="flex items-center gap-1.5" title={fillerWords.map(f => `${f.word}×${f.count}`).join(', ')}>
                      <AlertCircle className="size-3.5 text-orange-400" />
                      <span className="text-xs font-mono text-orange-400">{fillerWordCount} filler{fillerWordCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {isCameraOn && cameraMetrics.frames > 0 && (
                    <>
                      <div className="flex items-center gap-1" title="Eye contact">
                        <Eye className={`size-3.5 ${cameraScoreColor(cameraMetrics.eyeContact)}`} />
                        <span className={`text-xs font-mono ${cameraScoreColor(cameraMetrics.eyeContact)}`}>{cameraMetrics.eyeContact}%</span>
                      </div>
                      <div className="flex items-center gap-1" title="Posture">
                        <User className={`size-3.5 ${cameraScoreColor(cameraMetrics.posture)}`} />
                        <span className={`text-xs font-mono ${cameraScoreColor(cameraMetrics.posture)}`}>{cameraMetrics.posture}%</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* DRAGGABLE CAMERA PiP                       */}
          {/* ═══════════════════════════════════════════ */}
          {isCameraOn && (
            <div
              className="w-[180px] rounded-xl overflow-hidden border border-border/60 shadow-xl shadow-black/60"
              style={{
                position: 'absolute',
                left: pipPos.x,
                top: pipPos.y,
                zIndex: 25,
                cursor: isDragging ? 'grabbing' : 'default',
                transition: isDragging ? 'none' : 'all 0.1s',
              }}
            >
              {/* Drag handle */}
              <div
                onMouseDown={handlePipMouseDown}
                className="flex items-center justify-center py-0.5 bg-muted/90 border-b border-border/40 cursor-grab active:cursor-grabbing select-none"
              >
                <GripVertical className="size-3 text-muted-foreground" />
              </div>
              {/* Video */}
              <div className="relative" style={{ width: 180, height: 125 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* Camera metrics overlay */}
                {isRecording && cameraMetrics.frames > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-0.5 flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      <Eye className={`size-2 ${cameraScoreColor(cameraMetrics.eyeContact)}`} />
                      <span className={`text-[8px] font-mono ${cameraScoreColor(cameraMetrics.eyeContact)}`}>{cameraMetrics.eyeContact}%</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <User className={`size-2 ${cameraScoreColor(cameraMetrics.posture)}`} />
                      <span className={`text-[8px] font-mono ${cameraScoreColor(cameraMetrics.posture)}`}>{cameraMetrics.posture}%</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Sparkles className={`size-2 ${cameraScoreColor(cameraMetrics.presence)}`} />
                      <span className={`text-[8px] font-mono ${cameraScoreColor(cameraMetrics.presence)}`}>{cameraMetrics.presence}%</span>
                    </div>
                  </div>
                )}
              </div>
              {/* AI speaking indicator */}
              {aiSpeaking && (
                <div className="absolute -top-1 -right-1 flex items-center gap-0.5 bg-emerald-500/90 text-primary-foreground px-1.5 py-0.5 rounded-full">
                  <Volume2 className="size-2 animate-pulse" />
                  <span className="text-[7px] font-bold">AI</span>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TRANSCRIPT PANEL (Right slide-in)          */}
          {/* ═══════════════════════════════════════════ */}
          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ x: 280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 280, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute top-0 right-0 bottom-0 w-[280px] border-l border-border/60 bg-[#0c0c0e]/95 backdrop-blur-xl overflow-y-auto z-30"
              >
                <div className="p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Live Transcript</p>
                    <button onClick={() => setShowTranscript(false)} className="size-4 rounded flex items-center justify-center hover:bg-muted text-muted-foreground">
                      <X className="size-2.5" />
                    </button>
                  </div>

                  {/* Live stats */}
                  {isRecording && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="rounded-md bg-muted p-1.5 text-center">
                        <p className="text-[8px] text-muted-foreground">Pace</p>
                        <p className={`text-xs font-mono font-semibold ${paceColor}`}>{wordsPerMinute || '--'}<span className="text-[8px] text-muted-foreground ml-0.5">wpm</span></p>
                      </div>
                      <div className="rounded-md bg-muted p-1.5 text-center">
                        <p className="text-[8px] text-muted-foreground">Fillers</p>
                        <p className={`text-xs font-mono font-semibold ${fillerWordCount > 5 ? 'text-orange-400' : 'text-foreground'}`}>{fillerWordCount}</p>
                      </div>
                    </div>
                  )}

                  {/* Camera stats */}
                  {isCameraOn && cameraMetrics.frames > 0 && (
                    <div className="grid grid-cols-3 gap-1">
                      <div className="rounded-md bg-muted p-1 text-center">
                        <p className="text-[7px] text-muted-foreground">Eye</p>
                        <p className={`text-[10px] font-mono font-semibold ${cameraScoreColor(cameraMetrics.eyeContact)}`}>{cameraMetrics.eyeContact}%</p>
                      </div>
                      <div className="rounded-md bg-muted p-1 text-center">
                        <p className="text-[7px] text-muted-foreground">Posture</p>
                        <p className={`text-[10px] font-mono font-semibold ${cameraScoreColor(cameraMetrics.posture)}`}>{cameraMetrics.posture}%</p>
                      </div>
                      <div className="rounded-md bg-muted p-1 text-center">
                        <p className="text-[7px] text-muted-foreground">Presence</p>
                        <p className={`text-[10px] font-mono font-semibold ${cameraScoreColor(cameraMetrics.presence)}`}>{cameraMetrics.presence}%</p>
                      </div>
                    </div>
                  )}

                  {/* Screen context */}
                  {isScreenSharing && screenContext.description && (
                    <div className="rounded-md bg-emerald-400/5 border border-emerald-400/10 p-1.5">
                      <p className="text-[7px] text-success/60 font-semibold uppercase tracking-wider">Screen Context</p>
                      <p className="text-[10px] text-success/80 leading-tight mt-0.5">{screenContext.description}</p>
                    </div>
                  )}

                  {/* Transcript text */}
                  {presentationTranscript ? (
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{presentationTranscript}</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">{isRecording ? 'Listening...' : 'Start recording to see transcript.'}</p>
                  )}
                  <div ref={transcriptEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════ */}
          {/* AI INTERRUPTION POPUP                      */}
          {/* ═══════════════════════════════════════════ */}
          {interruptQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-[360px] z-30"
            >
              <div className="rounded-xl border border-violet-400/30 bg-[#111113]/95 backdrop-blur-xl p-3.5 shadow-lg shadow-violet-400/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{interruptJudge?.icon || '🎤'}</span>
                  <span className="text-[11px] text-chart-2 font-medium">{interruptJudge?.title || 'Judge'} asks:</span>
                  {aiSpeaking && (
                    <div className="flex items-center gap-1 ml-auto">
                      <Volume2 className="size-2.5 text-chart-2 animate-pulse" />
                      <span className="text-[9px] text-chart-2">Speaking</span>
                    </div>
                  )}
                </div>
                <p className="text-[13px] text-foreground leading-relaxed">{interruptQuestion}</p>
                <button onClick={dismissInterrupt} className="mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">Dismiss and continue</button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* TIME'S UP OVERLAY                          */}
          {/* ═══════════════════════════════════════════ */}
          {timeUp && isRecording && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-red-900/30 flex items-center justify-center z-40 pointer-events-auto">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400 mb-2">Time&apos;s Up!</p>
                <p className="text-sm text-foreground mb-4">Your {config.label} time has ended.</p>
                <Button size="lg" className="rounded-xl px-6 bg-primary hover:bg-primary text-primary-foreground font-semibold" onClick={handleDone}>
                  End & Get Score<ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        {/* ─── Floating Master Guider Telemetry HUD (for standard non-guided stages) ─── */}
      </div>

      {/* Dedicated Masterclass Coach Sidebar for Guided Mode */}
      {practiceMode === 'guided' && (
        <div className="w-full md:w-[380px] lg:w-[440px] border-l border-amber-500/20 bg-[#0c0c0e]/95 backdrop-blur-xl p-4 overflow-y-auto flex flex-col justify-start z-30 shrink-0">
          <MasterGuiderHud
            currentSlide={currentSlide}
            totalSlides={totalSlides}
            wpm={wordsPerMinute}
            transcript={presentationTranscript}
            onCoachRescue={handleCoachRescue}
            isRescueLoading={isRescueLoading}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* BOTTOM CONTROL BAR                          */}
      {/* ═══════════════════════════════════════════ */}
      <div className="h-16 shrink-0 border-t border-border/40 bg-[#0a0a0c] px-4 flex items-center justify-between z-40 relative">
        
        {/* Skip Intro Button (floats above bottom bar when active) */}
        {aiSpeaking && !interruptQuestion && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full shadow-lg border border-border bg-background/90 backdrop-blur-md text-xs font-semibold px-4 transition-all duration-300 hover:scale-105"
              onClick={() => {
                stopAudioPlayback();
                setAiSpeaking(false);
              }}
            >
              Skip Intro <ArrowRight className="size-3 ml-1.5" />
            </Button>
          </div>
        )}

        {/* Left Section: Timer and Slide Counter */}
        <div className="flex items-center gap-3">
          {isRecording ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-mono font-medium">
              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>{remaining !== null ? `-${formatTime(remaining)}` : formatTime(elapsed)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/40 border border-border text-muted-foreground text-xs font-mono font-medium">
              <span className="size-1.5 rounded-full bg-zinc-500" />
              <span>00:00</span>
            </div>
          )}

          {isScreenSharing && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Monitor className="size-3" />
              <span>Sharing</span>
            </div>
          )}

          {aiSpeaking && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
              <Volume2 className="size-3 animate-pulse" />
              <span>AI Speaking</span>
            </div>
          )}

          {hasSlides && !isImpromptu && (
            <div className="flex items-center gap-1 bg-muted/20 border border-border rounded-lg px-1.5 py-1">
              <button
                onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                disabled={currentSlide === 0}
                className="size-6 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                title="Previous slide"
              >
                <ChevronLeft className="size-3.5 text-foreground" />
              </button>
              <span className="text-[10px] text-muted-foreground font-mono min-w-[48px] text-center">
                {currentSlide + 1} / {totalSlides}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                disabled={currentSlide >= totalSlides - 1}
                className="size-6 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                title="Next slide"
              >
                <ChevronRight className="size-3.5 text-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Center Section: Main Controls */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
          {/* Leave Button */}
          <button
            onClick={() => setShowBackConfirm(true)}
            className="flex items-center justify-center size-10 rounded-lg bg-[#141416] border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-foreground/40 transition-colors"
            title="Leave (Alt+Left)"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Replay Intro Button */}
          <button
            onClick={async () => {
              try {
                toast.info("Generating welcome introduction...");
                const res = await fetch('/api/intro', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title, judges }),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.text) {
                    playTTS(data.text, data.voice);
                  }
                } else {
                  toast.error("Failed to generate introduction");
                }
              } catch (err) {
                toast.error("Failed to replay introduction");
              }
            }}
            className="flex items-center justify-center size-10 rounded-lg bg-[#141416] border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-foreground/40 transition-colors"
            title="Replay Welcome Intro"
            disabled={aiSpeaking}
          >
            <Volume2 className="size-4" />
          </button>

          {/* Microphone/Record Button */}
          <button
            onClick={() => { if (isRecording) { stopRecording(); } else { startRecording(); } }}
            className={`flex items-center justify-center size-10 rounded-lg transition-all border ${
              isRecording
                ? 'bg-red-600 border-red-500 text-white hover:bg-red-500 animate-pulse'
                : 'bg-[#141416] border-border text-foreground hover:border-foreground/40 hover:bg-muted/20'
            }`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? <Square className="size-4 fill-current" /> : <Mic className="size-4" />}
          </button>

          {/* Camera Button */}
          <button
            onClick={toggleCamera}
            className={`flex items-center justify-center size-10 rounded-lg transition-all border ${
              isCameraOn
                ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                : 'bg-[#141416] border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/20'
            }`}
            title="Camera"
          >
            {isCameraOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
          </button>

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`flex items-center justify-center size-10 rounded-lg transition-all border ${
              isScreenSharing
                ? 'bg-success/20 border-success text-success hover:bg-success/30'
                : 'bg-[#141416] border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/20'
            }`}
            title="Screen Share"
          >
            {isScreenSharing ? <Monitor className="size-4" /> : <MonitorOff className="size-4" />}
          </button>

          {/* Participants Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center justify-center size-10 rounded-lg transition-all border ${
              sidebarOpen
                ? 'bg-violet-500/20 border-violet-500 text-violet-400 hover:bg-violet-500/30'
                : 'bg-[#141416] border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/20'
            }`}
            title="Participants"
          >
            <Users className="size-4" />
          </button>

          {/* Transcript Toggle Button */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`flex items-center justify-center size-10 rounded-lg transition-all border ${
              showTranscript
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 hover:bg-amber-500/30'
                : 'bg-[#141416] border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/20'
            }`}
            title="Transcript"
          >
            <MessageSquare className="size-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`flex items-center justify-center size-10 rounded-lg transition-all border ${
              isFullscreen
                ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                : 'bg-[#141416] border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/20'
            }`}
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>

        {/* Right Section: Finish Button */}
        <div>
          <Button
            size="sm"
            className="rounded-lg px-5 h-10 bg-red-600 border border-red-500 text-white font-semibold hover:bg-red-500 disabled:opacity-50 transition-colors"
            onClick={handleDone}
            disabled={isProcessing || isScoring || (!presentationTranscript.trim() && !isRecording)}
          >
            {isProcessing || isScoring ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'Finish'
            )}
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* BACK CONFIRMATION DIALOG                    */}
      {/* ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showBackConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowBackConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-muted border border-border/60 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">Leave presentation?</h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                {isRecording
                  ? 'You are still recording. Leaving will stop the recording and you may lose progress.'
                  : 'Are you sure you want to go back? Your progress will not be saved.'}
              </p>
              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setShowBackConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-500 hover:bg-red-400 text-white font-semibold"
                  onClick={async () => {
                    setShowBackConfirm(false);
                    if (isRecording) stopRecording();
                    if (cameraStream) {
                      cameraStream.getTracks().forEach((t) => t.stop());
                      setCameraStream(null);
                      setIsCameraOn(false);
                    }
                    if (screenStream) {
                      screenStream.getTracks().forEach((t) => t.stop());
                      setScreenStream(null);
                      setIsScreenSharing(false);
                    }
                    if (document.fullscreenElement) await document.exitFullscreen();
                    setStep(2);
                  }}
                >
                  Leave
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Document PiP Portal ─── */}
      {Boolean(pipWindow?.document?.body) ? createPortal(
        <div className="bg-[#0a0a0c] min-h-screen text-foreground p-4 flex flex-col gap-4 font-sans m-0 overflow-hidden border border-border/20 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                {isRecording ? 'Recording Live' : 'Standby'}
              </span>
              <span className={`text-sm font-mono font-bold tracking-tight ${isRecording ? 'text-red-400 animate-pulse' : 'text-foreground'}`}>
                {remaining !== null ? formatTime(remaining) : formatTime(elapsed)}
              </span>
            </div>
            {!('documentPictureInPicture' in window) && (
               <span className="text-[10px] text-amber-500 font-medium">Use split screen (PiP unsupported)</span>
            )}
          </div>
          
          {/* Participant Grid */}
          <div className="grid grid-cols-2 gap-3 flex-1">
             {judges.map((j) => (
               <div key={j.id} className="relative group rounded-xl bg-[#141416] border-2 border-border/20 shadow-inner flex flex-col items-center justify-center p-4 transition-all duration-300">
                 <div className={`size-14 sm:size-16 rounded-full flex items-center justify-center text-3xl mb-2 ${aiSpeaking ? 'border-2 border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105' : 'border border-border/50 bg-muted/50'} transition-all duration-300`}>
                    {j.icon}
                 </div>
                 <span className="text-xs font-medium text-foreground tracking-wide text-center">{j.title}</span>
                 {aiSpeaking && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm">
                      <Volume2 className="size-3 animate-pulse" />
                      <span className="text-[9px] font-bold">Speaking</span>
                    </div>
                 )}
               </div>
             ))}
          </div>

          {/* Controls Footer */}
          <div className="flex items-center gap-3 mt-auto">
             <Button 
               onClick={isRecording ? stopRecording : startRecording} 
               className={`flex-1 h-12 font-semibold transition-all shadow-lg hover:scale-[1.02] active:scale-95 ${isRecording ? 'bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-destructive/20' : 'bg-primary/90 text-primary-foreground hover:bg-primary shadow-primary/20'}`}
             >
               {isRecording ? <Square className="size-4 mr-2" /> : <Mic className="size-4 mr-2" />}
               {isRecording ? 'Stop Recording' : 'Start Mic'}
             </Button>
             
             <Button 
               variant="secondary" 
               className="flex-1 h-12 font-medium border border-border/40 bg-[#141416] hover:bg-muted shadow-sm hover:scale-[1.02] active:scale-95"
               onClick={async () => {
                 if (pipWindow) pipWindow.close();
                 handleDone();
               }}
             >
               Finish Pitch <ArrowRight className="size-4 ml-2" />
             </Button>
          </div>
        </div>,
        pipWindow!.document.body
      ) : null}
    </div>
  );
}
