'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Sparkles, Volume2, Mic, MicOff, ChevronLeft, ChevronRight,
  ArrowRight, RefreshCw, FileText, CheckCircle2, AlertTriangle, Layers, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { playTTS } from '@/lib/voice-engine';
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

  // Ensure practiceMode is guided
  useEffect(() => {
    setPracticeMode('guided');
  }, [setPracticeMode]);

  // Load Session Data
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await authenticatedFetch(`/api/session/${sessionId}`);
        if (!res.ok) throw new Error('Session not found');
        const data = await res.json();
        setSession(data.session || data);
      } catch (err) {
        toast.error('Failed to load rehearsal session');
      }
    }
    loadSession();
  }, [sessionId]);

  const slides = session?.deck?.slides || session?.slides || [];
  const totalSlides = slides.length || 1;
  const currentSlideObj = slides[currentSlide];

  // Fetch AI Teleprompter Script for current slide if not cached
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

  // Play Coach Demo Audio
  const handlePlayDemo = async () => {
    const activeScript = scriptsMap[currentSlide];
    if (!activeScript) return;

    setIsPlayingDemo(true);
    try {
      const demoText = `${activeScript.openingHook} ${activeScript.rescueScript}`;
      const voiceId = coachPersona === 'sarah'
        ? 'a7a59115-2425-4192-844c-1e98ec7d6877'
        : '533b2990-5b82-45a4-b9f2-367776972ca6';
      await playTTS(demoText, voiceId);
    } catch {
      toast.error('Voiceover demo unavailable');
    } finally {
      setIsPlayingDemo(false);
    }
  };

  // Coach Rescue Handler
  const handleCoachRescue = async () => {
    const activeScript = scriptsMap[currentSlide];
    if (!activeScript) return;

    setIsRescueLoading(true);
    try {
      const voiceId = coachPersona === 'sarah'
        ? 'a7a59115-2425-4192-844c-1e98ec7d6877'
        : '533b2990-5b82-45a4-b9f2-367776972ca6';
      await playTTS(activeScript.rescueScript, voiceId);
      toast.success('Coach rescue script spoken aloud');
    } catch {
      toast.error('Rescue audio unavailable');
    } finally {
      setIsRescueLoading(false);
    }
  };

  const currentScript = scriptsMap[currentSlide];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* ════════════════════════════════════════════════ */}
      {/* LEFT COLUMN: Presentation & AI Teleprompter     */}
      {/* ════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden relative border-r border-slate-800">
        {/* Top Header Bar */}
        <div className="h-14 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="text-xs text-slate-400 hover:text-white">
              <ChevronLeft className="size-4 mr-1" /> Dashboard
            </Button>
            <span className="h-4 w-px bg-slate-800" />
            <h1 className="text-sm font-bold text-white truncate max-w-sm">
              {session?.title || 'Masterclass Rehearsal'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> Executive Studio Mode
            </span>
          </div>
        </div>

        {/* Center: Slide Display */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative bg-slate-950">
          {slides.length > 0 ? (
            <div className="w-full max-w-3xl flex flex-col items-center">
              <img
                key={currentSlide}
                src={slides[currentSlide]?.imageUrl}
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-auto max-h-[50vh] object-contain rounded-2xl border border-slate-800 shadow-2xl bg-slate-900"
              />
              <div className="mt-3 flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide(c => Math.max(0, c - 1))}
                  className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="size-4 mr-1" /> Previous
                </Button>
                <span className="text-xs font-mono text-slate-400">
                  Slide <strong className="text-amber-400">{currentSlide + 1}</strong> of {totalSlides}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentSlide >= totalSlides - 1}
                  onClick={() => setCurrentSlide(c => Math.min(totalSlides - 1, c + 1))}
                  className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                >
                  Next <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 text-sm italic">
              Loading slide deck presentation...
            </div>
          )}
        </div>

        {/* Bottom Section: AI Teleprompter & Script Guide */}
        <div className="h-52 border-t border-slate-800 bg-slate-900/80 p-4 overflow-y-auto shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                AI Teleprompter & Talking Points (Slide {currentSlide + 1})
              </span>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={isPlayingDemo || !currentScript}
              onClick={handlePlayDemo}
              className="h-7 border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold"
            >
              <Volume2 className="size-3.5 mr-1" /> {isPlayingDemo ? 'Speaking...' : 'Demonstrate Delivery'}
            </Button>
          </div>

          {isLoadingScript ? (
            <div className="p-4 text-center text-xs text-amber-300 italic flex items-center justify-center gap-2">
              <RefreshCw className="size-4 animate-spin text-amber-400" /> Generating high-impact talking points for Slide {currentSlide + 1}...
            </div>
          ) : currentScript ? (
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 font-semibold flex items-center gap-2">
                <Play className="size-3 text-amber-400 shrink-0" />
                <span>Opening Hook: &ldquo;{currentScript.openingHook}&rdquo;</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {currentScript.talkingPoints.map((point, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 leading-relaxed">
                    <span className="font-bold text-amber-400 mr-1">{idx + 1}.</span> {point}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">No script generated for this slide.</div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="h-16 border-t border-slate-800 bg-slate-950 px-6 flex items-center justify-between shrink-0">
          <Button
            onClick={() => setIsRecording(!isRecording)}
            className={cn(
              'rounded-xl px-5 font-bold text-xs flex items-center gap-2 transition-all',
              isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
            )}
          >
            {isRecording ? <><MicOff className="size-4" /> Pause Recording</> : <><Mic className="size-4" /> Start Rehearsal</>}
          </Button>

          <Button
            onClick={() => router.push(`/reports/${sessionId}`)}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs flex items-center gap-2"
          >
            Finish Rehearsal <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════ */}
      {/* RIGHT COLUMN: Masterclass Telemetry Console    */}
      {/* ════════════════════════════════════════════════ */}
      <div className="w-full md:w-[380px] lg:w-[440px] border-l border-amber-500/20 bg-[#0c0c0e]/95 backdrop-blur-xl p-4 overflow-y-auto flex flex-col justify-start z-30 shrink-0">
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
