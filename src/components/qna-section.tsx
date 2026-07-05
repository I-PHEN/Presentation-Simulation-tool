'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, Volume2, VolumeX, Flag, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore, getVoiceForJudge } from '@/lib/store';
import { initVoiceEngine, generateTTS, playAudioData, createSTT, isEngineLoaded, unlockAudio } from '@/lib/voice-engine';
import { toast } from 'sonner';

function StreamingText({
  text,
  audioDurationMs,
  speed = 400,
  onWordAdded,
  onFinished,
}: {
  text: string;
  audioDurationMs?: number;
  speed?: number;
  onWordAdded?: () => void;
  onFinished?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState(() => text.split(' ')[0] || '');
  const onWordAddedRef = useRef(onWordAdded);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onWordAddedRef.current = onWordAdded;
    onFinishedRef.current = onFinished;
  }, [onWordAdded, onFinished]);

  useEffect(() => {
    const words = text.split(' ');
    let currentWordIndex = 0;

    if (words.length <= 1) {
      onFinishedRef.current?.();
      return;
    }

    let getWordDelay = () => speed;

    if (audioDurationMs && audioDurationMs > 0) {
      let totalWeight = 0;
      for (const w of words) {
        totalWeight += w.length + 1;
        if (w.endsWith(',')) totalWeight += 2;
        if (w.endsWith('.')) totalWeight += 4;
        if (w.endsWith('?')) totalWeight += 4;
        if (w.endsWith('!')) totalWeight += 4;
      }
      
      const msPerWeight = audioDurationMs / totalWeight;
      
      getWordDelay = (word: string) => {
        let weight = word.length + 1;
        if (word.endsWith(',')) weight += 2;
        if (word.endsWith('.')) weight += 4;
        if (word.endsWith('?')) weight += 4;
        if (word.endsWith('!')) weight += 4;
        return weight * msPerWeight;
      };
    }

    let timeoutId: NodeJS.Timeout;

    const streamNextWord = () => {
      currentWordIndex++;
      if (currentWordIndex < words.length) {
        setDisplayedText((prev) => prev + ' ' + words[currentWordIndex]);
        onWordAddedRef.current?.();
        timeoutId = setTimeout(streamNextWord, getWordDelay(words[currentWordIndex]));
      } else {
        onFinishedRef.current?.();
      }
    };

    timeoutId = setTimeout(streamNextWord, getWordDelay(words[0]));

    return () => clearTimeout(timeoutId);
  }, [text, audioDurationMs, speed]); // Removed unstable callback dependencies

  return (
    <span>
      {displayedText}
      <span className="inline-block w-1 h-3.5 ml-1 bg-primary animate-pulse align-middle" />
    </span>
  );
}

export default function QNASection() {
  const {
    sessionId, judges, transcript, addTranscript,
    isScoring, setIsScoring, setScores, setFeedback,
    setWeaknesses, setRecommendations, setKnowledgeGaps, setJudgeFeedback, setStep,
  } = useAppStore();

  const [isRecording, setIsRecording] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [currentJudgeIndex, setCurrentJudgeIndex] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const hasStartedRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [currentAudioDurationMs, setCurrentAudioDurationMs] = useState(0);

  const startRecordingRef = useRef<() => void>();
  const stopRecordingRef = useRef<() => void>();
  const isInterruptedRef = useRef(false);

  // Voice Activity Detection (Silence Timer)
  useEffect(() => {
    if (isRecording && liveTranscript) {
      const timer = setTimeout(() => {
        if (isRecording && !isProcessingAudio) {
           stopRecordingRef.current?.();
        }
      }, 3000); // 3 seconds of silence = turn end
      return () => clearTimeout(timer);
    }
  }, [liveTranscript, isRecording, isProcessingAudio]);

  // Which judge is currently asking
  const currentJudge = judges[currentJudgeIndex % judges.length] || judges[0] || { id: 'investor', icon: '💰', title: 'Investor', type: 'investor' };

  const [moonshineTranscriber, setMoonshineTranscriber] = useState<any>(null);

  const handleWordAdded = useCallback(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  useEffect(() => {
    initVoiceEngine();
    // Unlock audio context immediately on mount
    unlockAudio();
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, liveTranscript]);

  const playTTS = useCallback(async (text: string, judgeType?: string) => {
    if (!ttsEnabled) return;
    try {
      const voice = judgeType ? getVoiceForJudge(judgeType) : 'd46abd1d-2d02-43e8-819f-51fb652c1c61';
      setIsPlayingTTS(true);
      const audioResult = await generateTTS(text, voice);
      await playAudioData(audioResult);
      setIsPlayingTTS(false);
    } catch { setIsPlayingTTS(false); }
  }, [ttsEnabled]);

  const stopTTS = useCallback(() => {
    // Currently no easy way to stop Web Audio API once scheduled without holding a reference to the source.
    // For now we just reset state.
    setIsPlayingTTS(false);
  }, []);

  // Rotate to next judge after each exchange
  const rotateJudge = useCallback(() => {
    if (judges.length > 1) {
      setCurrentJudgeIndex(prev => (prev + 1) % judges.length);
    }
  }, [judges.length]);

  // Send message to multi-chat with the current judge's persona
  const sendUserMessage = useCallback(async (text: string, judgeType: string, judgeTitle: string) => {
    if (!text.trim() || !sessionId) return;
    addTranscript('presenter', text.trim());
    setIsAILoading(true);
    try {
      const res = await fetch('/api/multi-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text.trim(), judgeType, judgeTitle }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const aiResponse = data.response || data.message;

      let audioResult = null;
      let durationMs = 0;
      if (ttsEnabled) {
        try {
          const voice = judgeType ? getVoiceForJudge(judgeType) : 'd46abd1d-2d02-43e8-819f-51fb652c1c61';
          audioResult = await generateTTS(aiResponse, voice);
          const audioObj = new Audio(URL.createObjectURL(audioResult.audio));
          await new Promise(resolve => {
            audioObj.onloadedmetadata = resolve;
            audioObj.onerror = resolve;
          });
          if (!isNaN(audioObj.duration) && audioObj.duration > 0) {
            durationMs = audioObj.duration * 1000;
          }
        } catch { /* TTS fail */ }
      }

      setIsAILoading(false); // Remove "Thinking..." bubble right before audio starts

      const targetIndex = useAppStore.getState().transcript.length;
      setCurrentAudioDurationMs(durationMs);
      addTranscript('judge', aiResponse, judgeType);
      setStreamingMessageIndex(targetIndex);
      
      if (audioResult) {
        isInterruptedRef.current = false;
        setIsPlayingTTS(true);
        await playAudioData(audioResult);
        setIsPlayingTTS(false);
        if (!isInterruptedRef.current) {
          startRecordingRef.current?.();
        }
      } else {
        if (!isInterruptedRef.current) {
          startRecordingRef.current?.();
        }
      }
      rotateJudge();
    } catch {
      toast.error('Failed to get response');
      setIsAILoading(false);
    }
  }, [sessionId, addTranscript, ttsEnabled, rotateJudge]);

  useEffect(() => {
    if (!hasStartedRef.current && sessionId && !isAILoading && judges.length > 0) {
      hasStartedRef.current = true;
      const firstJudge = judges[0];
      setIsAILoading(true);
      const startQA = async () => {
        try {
          const res = await fetch('/api/multi-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              message: 'I have finished my presentation. Please ask me your first question.',
              judgeType: firstJudge.type,
              judgeTitle: firstJudge.title,
            }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          const aiResponse = data.response || data.message;

          let audioResult = null;
          let durationMs = 0;
          if (ttsEnabled) {
            try {
              const voice = firstJudge.type ? getVoiceForJudge(firstJudge.type) : 'd46abd1d-2d02-43e8-819f-51fb652c1c61';
              audioResult = await generateTTS(aiResponse, voice);
              const audioObj = new Audio(URL.createObjectURL(audioResult.audio));
              await new Promise(resolve => {
                audioObj.onloadedmetadata = resolve;
                audioObj.onerror = resolve;
              });
              if (!isNaN(audioObj.duration) && audioObj.duration > 0) {
                durationMs = audioObj.duration * 1000;
              }
            } catch { /* TTS fail */ }
          }

          setIsAILoading(false);

          const targetIndex = useAppStore.getState().transcript.length;
          setCurrentAudioDurationMs(durationMs);
          addTranscript('judge', aiResponse, firstJudge.type);
          setStreamingMessageIndex(targetIndex);

          if (audioResult) {
            isInterruptedRef.current = false;
            setIsPlayingTTS(true);
            await playAudioData(audioResult);
            setIsPlayingTTS(false);
            if (!isInterruptedRef.current) {
              startRecordingRef.current?.();
            }
          } else {
            if (!isInterruptedRef.current) {
              startRecordingRef.current?.();
            }
          }
          rotateJudge();
        } catch {
          toast.error('Failed to start Q&A');
          setIsAILoading(false);
        }
      };
      startQA();
    }
  }, [sessionId, isAILoading, judges, addTranscript, playTTS, ttsEnabled, rotateJudge]);

  const startRecording = async () => {
    stopTTS();
    setIsRecording(true);
    setLiveTranscript('');
    try {
      if (!isEngineLoaded()) {
        toast.info('Initializing voice models... this may take a moment the first time.');
      }
      isInitializingRef.current = true;
      const transcriber = await createSTT(
        (text) => {
          setLiveTranscript(text);
        },
        (text) => {
          // Commit handled via stopRecording
        }
      );
      if (!isInitializingRef.current) {
        // User clicked stop before initialization finished
        if (typeof transcriber.stop === 'function') transcriber.stop();
        return;
      }
      setMoonshineTranscriber(transcriber);
      if (typeof transcriber.start === 'function') transcriber.start();
    } catch { 
      toast.error('Microphone access denied or model failed to load'); 
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
      
      setMoonshineTranscriber(null); // Force re-init on next tap to prevent InvalidStateError
      
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
    stopTTS();
    setIsScoring(true);
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, judges, cameraMetrics: useAppStore.getState().cameraMetrics.frames > 0 ? useAppStore.getState().cameraMetrics : undefined }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const s = data.score || data;
      setScores({ clarity: s.clarity, confidence: s.confidence, technical: s.technical, storytelling: s.storytelling, persuasiveness: s.persuasiveness, conciseness: s.conciseness, verbatimReading: s.verbatimReading || 0, eyeContact: s.eyeContact || 0, posture: s.posture || 0, cameraPresence: s.cameraPresence || 0, overall: s.overall });
      setFeedback(s.feedback || '');
      setWeaknesses(s.weaknesses || []);
      setRecommendations(s.recommendations || []);
      setJudgeFeedback(s.judgeFeedback || []);
      setKnowledgeGaps(s.knowledgeGaps || []);
      setStep(5);
    } catch { toast.error('Scoring failed'); }
    finally { setIsScoring(false); }
  };

  // Find judge info by type for displaying in transcript
  const getJudgeInfo = (judgeType?: string) => {
    if (!judgeType) return { icon: '🎤', title: 'Judge' };
    return judges.find(j => j.type === judgeType) || { icon: '🎤', title: 'Judge' };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 border-b border-border bg-surface/80 backdrop-blur-xl px-5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Show all judges */}
          <div className="flex items-center -space-x-1">
            {judges.map((j, i) => (
              <div key={j.id} className={`size-7 rounded-full flex items-center justify-center text-xs border-2 ${
                i === currentJudgeIndex % judges.length ? 'border-foreground/30 bg-muted/60' : 'border-border bg-muted'
              }`}>
                {j.icon}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-medium ml-1">
            {currentJudge.title}&apos;s turn
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setTtsEnabled(!ttsEnabled); if (ttsEnabled) stopTTS(); }}
            className="size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          >
            {ttsEnabled ? <Volume2 className="size-3.5 text-primary" /> : <VolumeX className="size-3.5 text-muted-foreground" />}
          </button>
          <span className="text-[11px] text-muted-foreground">{transcript.length} exchanges</span>
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        <div className="max-w-2xl mx-auto space-y-3 pb-8">
          <AnimatePresence mode="popLayout" initial={false}>
            {transcript.map((entry, i) => {
              const judgeInfo = getJudgeInfo(entry.judgeId);
              return (
                <motion.div
                  layout
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${entry.role === 'presenter' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                    entry.role === 'presenter'
                      ? 'bg-muted/30 border border-foreground/20'
                      : 'bg-muted border border-border'
                  }`}>
                    {entry.role === 'judge' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs">{judgeInfo.icon}</span>
                        <span className="text-[11px] font-medium text-muted-foreground">{judgeInfo.title}</span>
                      </div>
                    )}
                    {entry.role === 'presenter' && (
                      <div className="flex items-center gap-1.5 mb-1.5 justify-end">
                        <span className="text-[11px] font-medium text-primary/60">You</span>
                        <Mic className="size-3 text-primary/60" />
                      </div>
                    )}
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {entry.role === 'judge' && i === streamingMessageIndex ? (
                        <StreamingText
                          text={entry.content}
                          audioDurationMs={currentAudioDurationMs}
                          speed={200}
                          onWordAdded={handleWordAdded}
                          onFinished={() => setStreamingMessageIndex(null)}
                        />
                      ) : (
                        entry.content
                      )}
                    </p>
                    {entry.role === 'judge' && ttsEnabled && (
                      <button
                        onClick={() => playTTS(entry.content, entry.judgeId)}
                        className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Volume2 className="size-3" /> Replay
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* User Live/Interim Transcript */}
            {(isRecording || isProcessingAudio) && (
              <motion.div
                layout
                key="live-transcript"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex justify-end"
              >
                <div className="max-w-[80%] rounded-xl px-4 py-3 bg-muted/30 border border-foreground/20">
                  <div className="flex items-center gap-1.5 mb-1.5 justify-end">
                    <span className="text-[11px] font-medium text-primary/60">
                      {isProcessingAudio ? 'You (Processing...)' : 'You (Speaking...)'}
                    </span>
                    {isProcessingAudio ? (
                      <Loader2 className="size-3 animate-spin text-primary/60" />
                    ) : (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    )}
                  </div>
                  <p className={`text-sm text-foreground leading-relaxed whitespace-pre-wrap italic ${isProcessingAudio ? 'opacity-50' : 'opacity-85'}`}>
                    {liveTranscript || 'Listening...'}
                  </p>
                </div>
              </motion.div>
            )}

            {isAILoading && (
              <motion.div
                layout
                key="ai-loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex justify-start"
              >
                <div className="bg-muted border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{currentJudge.icon}</span>
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">{currentJudge.title} is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {isPlayingTTS && (
              <motion.div
                layout
                key="ai-speaking"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex justify-start"
              >
                <div className="bg-muted/20 border border-border/50 rounded-xl px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="size-3.5 text-primary animate-pulse" />
                    <span className="text-[11px] text-primary">Speaking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Controls Floating Dock */}
      <div className="shrink-0 pb-6 pt-2 bg-gradient-to-t from-background to-transparent px-5">
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          {!isRecording && !isAILoading && transcript.length > 0 && (
            <p className="text-center text-[11px] text-muted-foreground mb-2">
              Press the mic to respond to {currentJudge.title}, or end session to get your score.
            </p>
          )}
          {isRecording && (
            <p className="text-center text-[11px] text-primary mb-2">
              <span className="size-1.5 rounded-full bg-primary animate-pulse inline-block mr-1.5 align-middle" />
              Listening... speak your answer, then press stop.
            </p>
          )}
          {isProcessingAudio && (
            <p className="text-center text-[11px] text-muted-foreground mb-2">
              <Loader2 className="size-3 animate-spin inline mr-1.5 align-middle" />
              Perfecting transcript...
            </p>
          )}
            <div className="glass rounded-full px-4 py-3 flex items-center gap-4 shadow-lg border border-border/40">
              <button
                onClick={() => {
                  if (isPlayingTTS) {
                    isInterruptedRef.current = true;
                  }
                  if (isRecording) stopRecordingRef.current?.();
                  else startRecordingRef.current?.();
                }}
                disabled={isAILoading || isScoring || isProcessingAudio}
                className={`relative size-12 rounded-full flex items-center justify-center transition-colors hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed ${
                  isRecording 
                    ? 'bg-destructive text-destructive-foreground' 
                    : 'bg-foreground text-background'
                }`}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                {isRecording ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
              </button>

              <div className="w-px h-8 bg-border" />

              <Button
                size="sm"
                className="rounded-none px-5 h-10 bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                onClick={handleEndSession}
                disabled={isScoring || transcript.length < 1}
              >
                {isScoring ? (
                  <><Loader2 className="size-3.5 animate-spin mr-1.5" />Scoring...</>
                ) : (
                  <><Flag className="size-3.5 mr-1.5" />Finish Q&A</>
                )}
              </Button>
            </div>
          </div>
        </div>
    </div>
  );
}
