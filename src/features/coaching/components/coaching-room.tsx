'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { generateTTS, playAudioData } from '@/lib/voice-engine';
import { toast } from 'sonner';

import { CoachingHeader } from './coaching-header';
import { CoachingSlideViewer } from './coaching-slide-viewer';
import { CoachingTeleprompter } from './coaching-teleprompter';
import { CoachingControls } from './coaching-controls';
import MasterGuiderHud from './master-guider-hud';
import type { SlideScriptData } from '../types';

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Left Column: Slide & Script Stage */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden relative border-r border-border">
        <CoachingHeader
          title={session?.title}
          onBack={() => router.push('/dashboard')}
        />

        <CoachingSlideViewer
          slides={slides}
          currentSlide={currentSlide}
          onPrevious={() => setCurrentSlide(c => Math.max(0, c - 1))}
          onNext={() => setCurrentSlide(c => Math.min(totalSlides - 1, c + 1))}
        />

        <CoachingTeleprompter
          currentSlide={currentSlide}
          script={scriptsMap[currentSlide]}
          isLoading={isLoadingScript}
          isPlayingDemo={isPlayingDemo}
          onPlayDemo={handlePlayDemo}
        />

        <CoachingControls
          isRecording={isRecording}
          onToggleRecording={() => setIsRecording(!isRecording)}
          onFinish={() => router.push(`/reports/${sessionId}`)}
        />
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
