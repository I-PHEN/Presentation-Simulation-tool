'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, Volume2, Mic, MicOff, ChevronLeft, ChevronRight,
  ArrowRight, RefreshCw, FileText, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { generateTTS, playAudioData } from '@/lib/voice-engine';
import { toast } from 'sonner';
import MasterGuiderHud from '@/components/master-guider-hud';

interface SlideScriptData {
  openingHook: string;
  talkingPoints: string[];
  rescueScript: string;
}

export function CoachingRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const {
    coachPersona, presenterDirectives, explanationDepth,
    setPracticeMode,
  } = useAppStore();

  const [session, setSession] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [wpm, setWpm] = useState(135);
  const [transcript, setTranscript] = useState('');
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [isRescueLoading, setIsRescueLoading] = useState(false);
  const [scriptsMap, setScriptsMap] = useState<Record<number, SlideScriptData>>({});

  useEffect(() => {
    setPracticeMode('guided');
  }, [setPracticeMode]);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await authenticatedFetch(`/api/session/${sessionId}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        setSession(data.session || data);
      } catch (err) {
        toast.error('Failed to load session');
      }
    }
    loadSession();
  }, [sessionId]);

  const slides = session?.deck?.slides || session?.slides || [];
  const totalSlides = slides.length || 1;
  const currentSlideObj = slides[currentSlide];

  useEffect(() => {
    if (!slides.length) return;
    if (scriptsMap[currentSlide]) return;

    async function fetchScript() {
      setIsLoadingScript(true);
      try {
        const res = await authenticatedFetch('/api/coaching/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slideText: currentSlideObj?.text || `Slide ${currentSlide + 1}`,
            slideIndex: currentSlide,
            presenterDirectives,
            coachPersona,
            explanationDepth,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setScriptsMap(prev => ({
            ...prev,
            [currentSlide]: {
              openingHook: data.openingHook,
              talkingPoints: data.talkingPoints,
              rescueScript: data.rescueScript,
            },
          }));
        }
      } catch (err) {
        console.error('Failed to fetch slide script:', err);
      } finally {
        setIsLoadingScript(false);
      }
    }

    fetchScript();
  }, [currentSlide, slides.length, currentSlideObj, presenterDirectives, coachPersona, explanationDepth, scriptsMap]);

  const handlePlayDemo = async () => {
    const activeScript = scriptsMap[currentSlide];
    if (!activeScript) return;

    setIsPlayingDemo(true);
    try {
      const demoText = `${activeScript.openingHook} ${activeScript.rescueScript}`;
      const voiceId = coachPersona === 'sarah'
        ? 'a7a59115-2425-4192-844c-1e98ec7d6877'
        : '533b2990-5b82-45a4-b9f2-367776972ca6';
      const audioResult = await generateTTS(demoText, voiceId);
      await playAudioData(audioResult);
    } catch {
      toast.error('Voiceover demo unavailable');
    } finally {
      setIsPlayingDemo(false);
    }
  };

  const handleCoachRescue = async () => {
    const activeScript = scriptsMap[currentSlide];
    if (!activeScript) return;

    setIsRescueLoading(true);
    try {
      const voiceId = coachPersona === 'sarah'
        ? 'a7a59115-2425-4192-844c-1e98ec7d6877'
        : '533b2990-5b82-45a4-b9f2-367776972ca6';
      const audioResult = await generateTTS(activeScript.rescueScript, voiceId);
      await playAudioData(audioResult);
      toast.success('Coach rescue script spoken aloud');
    } catch {
      toast.error('Rescue audio unavailable');
    } finally {
      setIsRescueLoading(false);
    }
  };

  const currentScript = scriptsMap[currentSlide];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Left Column: Presentation & Teleprompter */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden relative border-r border-border">
        {/* Header */}
        <div className="h-14 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="text-xs text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4 mr-1" /> Dashboard
            </Button>
            <span className="h-4 w-px bg-border" />
            <h1 className="text-sm font-medium text-foreground truncate max-w-sm">
              {session?.title || 'Coaching Session'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="size-4 text-primary" /> Delivery Coaching
            </span>
          </div>
        </div>

        {/* Center: Slide Display */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative bg-muted/20">
          {slides.length > 0 ? (
            <div className="w-full max-w-3xl flex flex-col items-center">
              <img
                key={currentSlide}
                src={slides[currentSlide]?.imageUrl}
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-auto max-h-[52vh] object-contain rounded-xl border border-border shadow-md bg-card"
              />
              <div className="mt-4 flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide(c => Math.max(0, c - 1))}
                >
                  <ChevronLeft className="size-4 mr-1" /> Previous
                </Button>
                <span className="text-xs font-mono text-muted-foreground">
                  Slide <strong className="text-foreground">{currentSlide + 1}</strong> of {totalSlides}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSlide >= totalSlides - 1}
                  onClick={() => setCurrentSlide(c => Math.min(totalSlides - 1, c + 1))}
                >
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm italic">
              Loading slides...
            </div>
          )}
        </div>

        {/* Teleprompter Panel */}
        <div className="h-48 border-t border-border bg-card p-4 overflow-y-auto shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Slide {currentSlide + 1} Talking Points & Script
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={isPlayingDemo || !currentScript}
              onClick={handlePlayDemo}
              className="h-7 text-xs"
            >
              <Volume2 className="size-3.5 mr-1" /> {isPlayingDemo ? 'Speaking...' : 'Demonstrate Delivery'}
            </Button>
          </div>

          {isLoadingScript ? (
            <div className="p-4 text-center text-xs text-muted-foreground italic flex items-center justify-center gap-2">
              <RefreshCw className="size-4 animate-spin text-primary" /> Generating talking points for Slide {currentSlide + 1}...
            </div>
          ) : currentScript ? (
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-md bg-muted/60 border border-border text-foreground font-medium flex items-center gap-2">
                <Play className="size-3 text-primary shrink-0" />
                <span>Hook: &ldquo;{currentScript.openingHook}&rdquo;</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {currentScript.talkingPoints.map((point, idx) => (
                  <div key={idx} className="p-2.5 rounded-md border border-border bg-surface text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground mr-1">{idx + 1}.</span> {point}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">No script generated for this slide.</div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="h-14 border-t border-border bg-card px-6 flex items-center justify-between shrink-0">
          <Button
            onClick={() => setIsRecording(!isRecording)}
            variant={isRecording ? "destructive" : "default"}
            size="sm"
            className="font-medium text-xs flex items-center gap-2"
          >
            {isRecording ? <><MicOff className="size-4" /> Pause Recording</> : <><Mic className="size-4" /> Start Rehearsal</>}
          </Button>

          <Button
            onClick={() => router.push(`/reports/${sessionId}`)}
            variant="secondary"
            size="sm"
            className="font-medium text-xs flex items-center gap-2"
          >
            Finish Rehearsal <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Right Column: Telemetry Console */}
      <div className="w-full md:w-[360px] lg:w-[400px] border-l border-border bg-card p-4 overflow-y-auto flex flex-col justify-start z-30 shrink-0">
        <MasterGuiderHud
          currentSlide={currentSlide}
          totalSlides={totalSlides}
          wpm={wpm}
          transcript={transcript}
          onCoachRescue={handleCoachRescue}
          isRescueLoading={isRescueLoading}
        />
      </div>
    </div>
  );
}
