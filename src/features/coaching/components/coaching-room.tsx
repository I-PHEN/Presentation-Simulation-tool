'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { generateTTS, playAudioData } from '@/lib/voice-engine';
import { toast } from 'sonner';

import { CoachingHeader } from './coaching-header';
import { CoachingSlideViewer } from './coaching-slide-viewer';
import { CoachingTeleprompter } from './coaching-teleprompter';
import { CoachingControls } from './coaching-controls';
import { CoachRescueModal } from './coach-rescue-modal';
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

  // Rescue Modal State
  const [rescueModalOpen, setRescueModalOpen] = useState(false);
  const [isPlayingRescueAudio, setIsPlayingRescueAudio] = useState(false);
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
        const active = data.defense || data.session || data;
        setSession(active);
      } catch (err) {
        toast.error('Failed to load session');
      }
    }
    loadSession();
  }, [sessionId]);

  const rawDeck = useMemo(() => {
    if (!session) return null;
    if (session.deck) return session.deck;
    if (session.deckContext) {
      try {
        return typeof session.deckContext === 'string' ? JSON.parse(session.deckContext) : session.deckContext;
      } catch {
        return null;
      }
    }
    return null;
  }, [session]);

  const slides = useMemo(() => {
    return rawDeck?.slides || session?.slides || (session?.topic ? [{ index: 1, text: session.topic, imageUrl: 'topic' }] : []);
  }, [rawDeck, session?.slides, session?.topic]);

  const totalSlides = slides.length || 1;
  const slideText = slides[currentSlide]?.text || session?.topic || `Slide ${currentSlide + 1}`;
  const scriptAlreadyLoaded = Boolean(scriptsMap[currentSlide]);

  useEffect(() => {
    if (!slides.length) return;
    if (scriptAlreadyLoaded) return;

    let isSubscribed = true;
    setIsLoadingScript(true);

    async function fetchScript() {
      try {
        const res = await authenticatedFetch('/api/coaching/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slideText,
            slideIndex: currentSlide,
            presenterDirectives,
            coachPersona,
            explanationDepth,
          }),
        });

        if (res.ok && isSubscribed) {
          const data = await res.json();
          const scriptData: SlideScriptData = {
            openingHook: data.openingHook,
            talkingPoints: data.talkingPoints,
            rescueScript: data.rescueScript,
          };
          setScriptsMap((prev) => ({ ...prev, [currentSlide]: scriptData }));
        }
      } catch (err) {
        console.error('Failed to fetch slide script:', err);
      } finally {
        if (isSubscribed) setIsLoadingScript(false);
      }
    }

    void fetchScript();

    return () => {
      isSubscribed = false;
    };
  }, [currentSlide, slides.length, slideText, coachPersona, explanationDepth, presenterDirectives, scriptAlreadyLoaded]);

  const [coachSpeechBubble, setCoachSpeechBubble] = useState<string | null>(null);
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  const isTopicSession = session?.source === 'topic' || Boolean(session?.topic) || slides[0]?.imageUrl === 'topic';

  const handlePlayDemo = async () => {
    const activeScript = scriptsMap[currentSlide];
    const demoText = activeScript
      ? `${activeScript.openingHook} ${activeScript.rescueScript}`
      : `Welcome to this presentation session. State your core thesis clearly and keep your pacing steady around 140 words per minute.`;

    setIsPlayingDemo(true);
    try {
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

  const handleOpenCoachRescue = () => {
    setRescueModalOpen(true);
  };

  const handleAskCoachAdvice = async () => {
    setIsAdviceLoading(true);
    try {
      const coachName = coachPersona === 'sarah' ? 'Coach Sarah' : 'Coach Marcus';
      let tip = `${coachName} Tip: Keep your pitch focused! Emphasize your key problem statement first.`;

      if (wpm > 170) {
        tip = `${coachName} Tip: You are rushing at ${wpm} WPM. Take a 2-second pause to let key points land.`;
      } else if (wpm > 0 && wpm < 110) {
        tip = `${coachName} Tip: Great deliberate pace at ${wpm} WPM. Add energy to your concluding hook!`;
      } else {
        tip = `${coachName} Tip: Excellent flow at ${wpm} WPM! Focus on engaging eye contact and bold assertions.`;
      }

      setCoachSpeechBubble(tip);

      const voiceId = coachPersona === 'sarah'
        ? 'a7a59115-2425-4192-844c-1e98ec7d6877'
        : '533b2990-5b82-45a4-b9f2-367776972ca6';
      const audioResult = await generateTTS(tip, voiceId);
      await playAudioData(audioResult);
    } catch {
      toast.info('Coach advice displayed in HUD');
    } finally {
      setIsAdviceLoading(false);
    }
  };

  const handlePlayRescueAudio = async () => {
    const activeScript = scriptsMap[currentSlide];
    if (!activeScript) return;

    setIsPlayingRescueAudio(true);
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
      setIsPlayingRescueAudio(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Left Column: Slide & Script Stage */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden relative border-r border-border">
        <CoachingHeader
          title={session?.title || session?.topic}
          onBack={() => router.push('/dashboard')}
        />

        <CoachingSlideViewer
          slides={slides}
          currentSlide={currentSlide}
          onPrevious={() => setCurrentSlide((c) => Math.max(0, c - 1))}
          onNext={() => setCurrentSlide((c) => Math.min(totalSlides - 1, c + 1))}
          topicTitle={session?.topic || session?.title}
        />

        <CoachingTeleprompter
          currentSlide={currentSlide}
          script={scriptsMap[currentSlide]}
          isLoading={isLoadingScript}
          isPlayingDemo={isPlayingDemo}
          onPlayDemo={handlePlayDemo}
          isTopicSession={isTopicSession}
        />

        <CoachingControls
          isRecording={isRecording}
          onToggleRecording={() => setIsRecording(!isRecording)}
          onFinish={() => router.push(`/reports/${sessionId}`)}
          onAskCoach={handleAskCoachAdvice}
          isAskingCoach={isAdviceLoading}
        />
      </div>

      {/* Right Column: Telemetry Console */}
      <div className="w-full md:w-[360px] lg:w-[400px] border-l border-border bg-card p-4 overflow-y-auto flex flex-col justify-start z-30 shrink-0">
        <MasterGuiderHud
          currentSlide={currentSlide}
          totalSlides={totalSlides}
          wpm={wpm}
          transcript={transcript}
          onCoachRescue={handleOpenCoachRescue}
          onAskCoachAdvice={handleAskCoachAdvice}
          isRescueLoading={isRescueLoading}
          isAdviceLoading={isAdviceLoading}
          coachSpeechBubble={coachSpeechBubble}
        />
      </div>

      {/* Coach Rescue Modal */}
      <CoachRescueModal
        open={rescueModalOpen}
        onOpenChange={setRescueModalOpen}
        script={scriptsMap[currentSlide]}
        coachPersona={coachPersona}
        onPlayAudio={handlePlayRescueAudio}
        isPlayingAudio={isPlayingRescueAudio}
      />
    </div>
  );
}
