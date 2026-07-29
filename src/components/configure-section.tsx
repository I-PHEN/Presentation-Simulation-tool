'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2, Mic, Check, ArrowLeft, Zap, MessageCircle,
  Volume2, Monitor, Clock, Users, Minus, Plus, GraduationCap,
  Briefcase, Building, ShoppingCart, Target, Lightbulb, HelpCircle, 
  Search, AlertCircle, Hand
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore, type Judge, practiceModeConfig, type PracticeMode, getVoiceForJudge } from '@/lib/store';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

const VOICE_OPTIONS = [
  { id: 'investor', name: 'Tyler (Confident Venture Pitch)', type: 'investor' },
  { id: 'professor', name: 'Warren (Authoritative Professor)', type: 'professor' },
  { id: 'hackathon_judge', name: 'Tanner (Casual Hackathon Lead)', type: 'hackathon_judge' },
  { id: 'customer', name: 'Amber (Skeptical Customer)', type: 'customer' },
  { id: 'executive', name: 'Reed (Decisive Executive VP)', type: 'executive' },
  { id: 'student', name: 'Gemma (Curious Student)', type: 'student' }
];

const FOCUS_AREA_OPTIONS = [
  { key: 'clarity', label: 'Clarity & Articulation', desc: 'Clear expression, simple vocabulary' },
  { key: 'confidence', label: 'Tone & Confidence', desc: 'Strong delivery, pacing, less filler words' },
  { key: 'technical', label: 'Technical Depth / Rigor', desc: 'Accurate terminology and deep reasoning' },
  { key: 'storytelling', label: 'Storytelling & Narrative', desc: 'Compelling structure, hook, and journey' },
  { key: 'persuasiveness', label: 'Persuasiveness & Influence', desc: 'Strong arguments, ROI, or impact focus' },
  { key: 'conciseness', label: 'Conciseness & Timing', desc: 'Brief, structured, direct answers' },
  { key: 'star', label: 'STAR Method Structure', desc: 'Evaluating answers in STAR framework format' }
];

const TEMPLATE_PRESETS = [
  {
    id: 'master_guider',
    label: 'Master Guider Rehearsal',
    desc: 'Slide-by-slide executive coaching on tone, explanation depth, and pacing.',
    practiceMode: 'guided',
    judges: [
      { id: '1', title: 'Coach Marcus', type: 'executive', voice: 'executive', desc: 'Executive Communication & Delivery Coach' }
    ],
    focusAreas: ['clarity', 'confidence', 'storytelling', 'conciseness'],
    customPrompt: 'Act as Coach Marcus, a warm, highly encouraging executive communication coach. Guide the presenter slide-by-slide with constructive feedback on vocal weight, pacing, and tone.'
  },
  {
    id: 'vc_pitch',
    label: 'Startup Pitch Deck',
    desc: 'Pitching to seed/venture capital investors.',
    practiceMode: 'pitch',
    judges: [
      { id: '1', title: 'Venture Capitalist', type: 'investor', voice: 'investor', desc: 'Focuses on ROI & financials' },
      { id: '2', title: 'Managing Director', type: 'executive', voice: 'executive', desc: 'Focuses on market size & risk' }
    ],
    focusAreas: ['clarity', 'storytelling', 'persuasiveness', 'confidence'],
    customPrompt: 'Act as seasoned tech investors listening to a startup seed pitch. Ask challenging questions about customer acquisition costs, business model sustainability, and product differentiation. Be realistic and press on numbers.'
  },
  {
    id: 'phd_defense',
    label: 'Academic Thesis Defense',
    desc: 'Presenting research to a thesis committee.',
    practiceMode: 'full',
    judges: [
      { id: '1', title: 'Head Professor', type: 'professor', voice: 'professor', desc: 'Focuses on research rigor' },
      { id: '2', title: 'External Reviewer', type: 'professor', voice: 'professor', desc: 'Focuses on gaps in proof' }
    ],
    focusAreas: ['technical', 'clarity', 'conciseness'],
    customPrompt: 'Act as members of an academic committee judging a doctoral thesis defense. Ask deep, academic questions about the methodology, baseline comparisons, and validity of assumptions.'
  },
  {
    id: 'tech_interview',
    label: 'Technical Systems Interview',
    desc: 'Software system design and technical grilling.',
    practiceMode: 'interview',
    judges: [
      { id: '1', title: 'Staff Systems Architect', type: 'tech_lead', voice: 'tech_lead', desc: 'Focuses on scale & trade-offs' },
      { id: '2', title: 'Engineering Manager', type: 'executive', voice: 'executive', desc: 'Focuses on delivery & team alignment' }
    ],
    focusAreas: ['technical', 'clarity', 'conciseness'],
    customPrompt: 'Act as senior engineering interviewers. Challenge the candidate on scale, single points of failure, cost trade-offs, and database choice. Press on why they chose specific components.'
  },
  {
    id: 'behavioral_interview',
    label: 'STAR Behavioral Screen',
    desc: 'Mock HR screen looking for culture fit.',
    practiceMode: 'interview',
    judges: [
      { id: '1', title: 'Lead Talent Partner', type: 'recruiter', voice: 'recruiter', desc: 'Focuses on behavior & STAR' }
    ],
    focusAreas: ['clarity', 'confidence', 'storytelling', 'persuasiveness', 'star'],
    customPrompt: 'Act as a friendly but observant HR recruiter. Ask situational behavioral questions and expect responses structured in the STAR format (Situation, Task, Action, Result).'
  },
  {
    id: 'poster_presentation',
    label: 'Poster Session / Exhibition',
    desc: 'Informal discussions with curious walk-ups.',
    practiceMode: 'full',
    judges: [
      { id: '1', title: 'Curious Attendee', type: 'student', voice: 'student', desc: 'Asks broad introductory questions' },
      { id: '2', title: 'Skeptical Competitor', type: 'customer', voice: 'customer', desc: 'Queries specific implementations' }
    ],
    focusAreas: ['clarity', 'persuasiveness', 'storytelling'],
    customPrompt: 'Act as conference walk-ups visiting a poster board. Ask quick, curious questions about what the project does, the main takeaways, and how it compares to standard work.'
  },
];

const PROMPT_TEMPLATE_CHIPS = [
  { label: '💼 Investor ROI Focus', text: 'Emphasize market opportunity, revenue projections, and unit economics on core slides. Keep tone confident and direct.' },
  { label: '🎓 Academic Defense Focus', text: 'Ensure methodology, baseline comparisons, and assumptions are explained with academic rigor without rushing.' },
  { label: '🤝 STAR Behavioral Screen', text: 'Structure key slide stories using Situation, Task, Action, and Result format with clear personal ownership.' },
  { label: '👔 Executive Summary Focus', text: 'Focus on high-level takeaways, keep explanations balanced and concise, and avoid unnecessary technical jargon.' }
];

const modeOptions: { mode: PracticeMode; label: string; desc: string; icon: typeof Users }[] = [
  { mode: 'guided', label: 'Master Guider (Rehearsal)', desc: 'Pre-practice voice & telemetry coaching', icon: GraduationCap },
  { mode: 'full', label: 'Full Presentation', desc: 'No time limit', icon: Users },
  { mode: 'pitch', label: '3-Min Pitch', desc: 'Elevator pitch', icon: Zap },
  { mode: 'impromptu', label: 'Impromptu', desc: 'Random topic, 2 min', icon: Mic },
  { mode: 'lecture', label: 'Lecture Mode', desc: 'Teach a class', icon: GraduationCap },
];

export default function ConfigureSection() {
  const { user } = useAuth();
  const {
    title, content, audienceType, setAudienceType, judges, setJudges,
    interruptionMode, setInterruptionMode, practiceMode, setPracticeMode,
    isAnalyzing, setIsAnalyzing, setStep, setSessionId, hasContent,
    inputMode, audienceCount, setAudienceCount, slides,
    targetRole, targetCompany, interviewStyle, setInterviewStyle,
    interviewStrictness, setInterviewStrictness,
    setCustomConfig,
    recordSession,
    setRecordSession,
    coachPersona,
    setCoachPersona,
    presenterDirectives,
    setPresenterDirectives,
  } = useAppStore();

  const isLecture = practiceMode === 'lecture';
  const isInterview = practiceMode === 'interview';

  // Local states for custom practice builder
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('vc_pitch');
  const [localJudges, setLocalJudges] = useState<Array<{ id: string; title: string; type: string; voice: string; desc: string }>>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>('');

  useEffect(() => {
    if (practiceMode === 'guided' || selectedTemplateId === 'master_guider') {
      const templ = TEMPLATE_PRESETS.find(t => t.id === 'master_guider');
      if (templ && selectedTemplateId !== 'master_guider') {
        setSelectedTemplateId(templ.id);
        setLocalJudges(templ.judges);
        setFocusAreas(templ.focusAreas);
        setCustomPrompt(templ.customPrompt);
      }
    } else if (isInterview) {
      const templ = TEMPLATE_PRESETS.find(t => t.id === 'tech_interview');
      if (templ && selectedTemplateId !== templ.id) {
        setSelectedTemplateId(templ.id);
        setLocalJudges(templ.judges);
        setFocusAreas(templ.focusAreas);
        setCustomPrompt(templ.customPrompt);
        setPracticeMode(templ.practiceMode as any);
      }
    } else if (!selectedTemplateId || selectedTemplateId === 'vc_pitch') {
      const templ = TEMPLATE_PRESETS.find(t => t.id === 'vc_pitch');
      if (templ && selectedTemplateId !== templ.id) {
        setSelectedTemplateId(templ.id);
        setLocalJudges(templ.judges);
        setFocusAreas(templ.focusAreas);
        setCustomPrompt(templ.customPrompt);
        setPracticeMode(templ.practiceMode as any);
      }
    }
  }, [isInterview, practiceMode, selectedTemplateId, setPracticeMode]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'investor': return <Briefcase className="size-4" />;
      case 'professor': return <GraduationCap className="size-4" />;
      case 'hackathon_judge': return <Target className="size-4" />;
      case 'customer': return <ShoppingCart className="size-4" />;
      case 'executive': return <Building className="size-4" />;
      case 'student': return <GraduationCap className="size-4" />;
      case 'tech_lead': return <Target className="size-4" />;
      case 'recruiter': return <Users className="size-4" />;
      default: return <Users className="size-4" />;
    }
  };

  // Microphone Test State
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [frequencies, setFrequencies] = useState<number[]>(new Array(16).fill(0));
  const [micError, setMicError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const startMicTest = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Small fftSize for quick frequency bands
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      setIsTestingMic(true);

      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Map dataArray to 16 frequency bands
        const bands: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 16));
        let sum = 0;
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          bands.push(val);
          sum += val;
        }
        setFrequencies(bands);

        // Calculate overall volume level
        const avg = sum / 16;
        const level = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(level);

        animationRef.current = requestAnimationFrame(update);
      };

      animationRef.current = requestAnimationFrame(update);
      toast.success('Microphone connected');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setMicError('Microphone access denied or not found');
      toast.error('Could not access microphone');
    }
  };

  const stopMicTest = () => {
    setIsTestingMic(false);
    setMicLevel(0);
    setFrequencies(new Array(16).fill(0));

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  // Auto clean up mic test on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleStart = async () => {
    stopMicTest();

    if (localJudges.length === 0) {
      toast.error('Add at least one panel member');
      return;
    }

    const selectedJudges = localJudges.map(j => ({
      id: j.id,
      title: j.title,
      type: j.type,
      voice: getVoiceForJudge(j.type),
      icon: j.title.charAt(0),
    }));

    setJudges(selectedJudges as any);

    const primaryType = selectedJudges[0].type;
    setAudienceType(primaryType);

    setIsAnalyzing(true);
    try {
      const configObj = {
        judges: localJudges.map(j => ({ id: j.id, title: j.title, type: j.type, voice: j.voice, desc: j.desc })),
        focusAreas,
        customPrompt,
        practiceMode,
        targetCompany: isInterview ? targetCompany : title,
        targetRole: isInterview ? targetRole : 'Presenter',
        recordSession
      };
      const customConfigStr = JSON.stringify(configObj);
      setCustomConfig(customConfigStr);

      const res = await authenticatedFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: isInterview ? `${targetRole} at ${targetCompany}` : title,
          content,
          audienceType: primaryType,
          practiceMode,
          userId: user?.uid || null,
          customConfig: customConfigStr
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionId) {
        throw new Error(data.error || 'Failed to set up session');
      }
      setSessionId(data.sessionId);
      
      // Start global audio session recording (if enabled)
      if (recordSession && typeof (window as any).startSessionRecording === 'function') {
        try {
          await (window as any).startSessionRecording();
        } catch (e) {
          console.error(e);
        }
      }

      setStep(3);
    } catch {
      toast.error('Failed to set up session');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row items-stretch bg-background overflow-hidden">
      {/* Left Column: Gear and Status Check */}
      <div className="w-full lg:w-[360px] shrink-0 border-r border-border bg-card p-6 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Equipment & Setup
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verify your setup before entering stage
            </p>
          </div>

          {/* Session Details Card */}
          <div className="rounded-xl border border-border/50 bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                <Monitor className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Session Details</h4>
                <p className="text-[9px] text-muted-foreground">Configuration summary</p>
              </div>
            </div>

            <div className="space-y-2 text-[11px]">
              {isInterview ? (
                <>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Target Role:</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{targetRole || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Target Company:</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{targetCompany || 'Not specified'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Presentation Title:</span>
                    <span className="font-semibold text-foreground truncate max-w-[150px]">{title || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Input Mode:</span>
                    <span className="font-semibold text-foreground">
                      {inputMode === 'upload' ? 'Slides uploaded' : 'Screen Share'}
                    </span>
                  </div>
                  {inputMode === 'upload' && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Slides Count:</span>
                      <span className="font-semibold text-foreground">{slides.length} slides</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Microphone Check Card */}
          <div className="rounded-xl border border-border/50 bg-background p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-1.5 rounded-md ${isTestingMic ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Mic className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Microphone check</h4>
                <p className="text-[9px] text-muted-foreground">
                  {isTestingMic ? 'Recording live signal' : 'Test your audio level'}
                </p>
              </div>
            </div>

            <div className="h-10 my-3 bg-muted/50 rounded-lg border border-border/40 flex items-center justify-center px-4 relative overflow-hidden">
              {micError ? (
                <p className="text-[9px] text-destructive font-medium text-center">{micError}</p>
              ) : isTestingMic ? (
                <div className="flex items-end justify-center gap-0.5 w-full h-6">
                  {frequencies.map((freq, i) => {
                    const heightPercent = Math.max(8, Math.round((freq / 255) * 100));
                    return (
                      <motion.div
                        key={i}
                        className="w-1 bg-primary rounded-t"
                        style={{ height: `${heightPercent}%` }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center">Click Test to verify signal</p>
              )}
            </div>

            <Button
              size="sm"
              variant={isTestingMic ? 'outline' : 'default'}
              className="w-full text-[11px] h-8 font-bold"
              onClick={isTestingMic ? stopMicTest : startMicTest}
            >
              {isTestingMic ? 'Stop Test' : 'Test Microphone'}
            </Button>
          </div>
        </div>

        <div className="text-[9px] text-muted-foreground/60 text-center pt-4 border-t border-border/20">
          Equipment synced with stage controls
        </div>
      </div>

      {/* Right Column: Configuration Options */}
      <div className="flex-1 bg-surface overflow-y-auto p-6 lg:p-10 flex flex-col justify-between">
        <div className="max-w-2xl w-full mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="size-8 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="size-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Configure Practice Stage
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isInterview ? `Mock Interview for ${targetRole} at ${targetCompany}` : (title || 'Untitled Presentation')}
              </p>
            </div>
          </div>

          {/* Preset templates selector */}
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 block">
              Choose Practice Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {TEMPLATE_PRESETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplateId(t.id);
                    setLocalJudges(t.judges);
                    setFocusAreas(t.focusAreas);
                    setCustomPrompt(t.customPrompt);
                    if (isInterview && t.practiceMode !== 'interview') {
                      // keep interview
                    } else if (!isInterview && t.practiceMode === 'interview') {
                      // keep full/pitch
                    } else {
                      setPracticeMode(t.practiceMode as any);
                    }
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    selectedTemplateId === t.id
                      ? 'bg-primary/5 border-primary ring-1 ring-primary shadow-sm'
                      : 'bg-card border-border hover:bg-muted/50'
                  }`}
                >
                  <div>
                    <div className="text-[11px] font-bold text-foreground mb-0.5">{t.label}</div>
                    <div className="text-[9px] text-muted-foreground leading-normal">{t.desc}</div>
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedTemplateId('custom');
                  setLocalJudges([{ id: 'custom-1', title: 'Custom Panelist', type: 'investor', voice: 'investor', desc: 'Custom reviewer' }]);
                  setFocusAreas(['clarity', 'confidence']);
                  setCustomPrompt('Act as a custom panel of judges. Ask questions about the core themes and press on clarity and reasoning.');
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  selectedTemplateId === 'custom'
                    ? 'bg-primary/5 border-primary ring-1 ring-primary shadow-sm'
                    : 'bg-card border-border hover:bg-muted/50'
                }`}
              >
                <div>
                  <div className="text-[11px] font-bold text-foreground mb-0.5">Custom Setup (Build Custom)</div>
                  <div className="text-[9px] text-muted-foreground leading-normal">Build custom panel members and behaviors.</div>
                </div>
              </button>
            </div>
          </div>

          {/* AI Panel Builder */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-foreground">AI Panel Members</h3>
                <p className="text-[10px] text-muted-foreground">Add up to 5 panel members and configure their roles & voices</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px] font-bold"
                disabled={localJudges.length >= 5}
                onClick={() => {
                  setSelectedTemplateId('custom');
                  setLocalJudges(prev => [
                    ...prev,
                    {
                      id: Math.random().toString(),
                      title: `Panelist ${prev.length + 1}`,
                      type: 'investor',
                      voice: 'investor',
                      desc: 'Custom panelist'
                    }
                  ]);
                }}
              >
                + Add Panelist
              </Button>
            </div>

            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {localJudges.map((judge, idx) => (
                <div key={judge.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/50">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground font-semibold">Title/Role:</label>
                      <input
                        type="text"
                        className="flex-1 bg-transparent text-xs font-bold text-foreground border-b border-border/50 focus:border-primary outline-none py-0.5 px-1 rounded"
                        value={judge.title}
                        onChange={(e) => {
                          setSelectedTemplateId('custom');
                          setLocalJudges(prev => prev.map((j, i) => i === idx ? { ...j, title: e.target.value } : j));
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-muted-foreground font-semibold">Voice Persona:</label>
                      <select
                        className="flex-1 bg-transparent text-xs font-medium text-foreground border border-border/50 rounded p-1 outline-none focus:border-primary"
                        value={judge.voice}
                        onChange={(e) => {
                          setSelectedTemplateId('custom');
                          const voiceVal = e.target.value;
                          const matchedOption = VOICE_OPTIONS.find(o => o.id === voiceVal);
                          setLocalJudges(prev => prev.map((j, i) => i === idx ? { ...j, voice: voiceVal, type: matchedOption?.type || 'investor' } : j));
                        }}
                      >
                        {VOICE_OPTIONS.map(v => (
                          <option key={v.id} value={v.id} className="bg-card text-foreground">{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {localJudges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId('custom');
                        setLocalJudges(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="text-[10px] text-red-500 hover:text-red-400 font-bold px-2 py-1 rounded hover:bg-red-500/10 transition-colors sm:self-center shrink-0 sm:self-center self-end"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Checklist for Focus Areas */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-bold text-foreground">AI Evaluation Focus Areas</h3>
              <p className="text-[10px] text-muted-foreground">Select the dimensions the AI should target and rate you on</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FOCUS_AREA_OPTIONS.map((area) => {
                const checked = focusAreas.includes(area.key);
                return (
                  <label
                    key={area.key}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      checked
                        ? 'bg-primary/5 border-primary/50'
                        : 'bg-background/40 border-border hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setFocusAreas(prev =>
                          prev.includes(area.key)
                            ? prev.filter(k => k !== area.key)
                            : [...prev, area.key]
                        );
                      }}
                      className="mt-0.5 rounded border-border text-primary focus:ring-primary/20 size-3 shrink-0"
                    />
                    <div>
                      <div className="text-[11px] font-bold text-foreground leading-none">{area.label}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{area.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Custom Prompt Instructions */}
          <div className="space-y-2.5 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-amber-400" /> Presenter Focus & Custom Directives (Prompt)
              </h3>
              <p className="text-[10px] text-muted-foreground">Specify custom directives or click a prompt template to focus your coach/judges</p>
            </div>

            {/* Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {PROMPT_TEMPLATE_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCustomPrompt(chip.text)}
                  className="px-2.5 py-1 rounded-lg border border-border/60 bg-muted/30 text-[10px] font-medium text-foreground hover:bg-primary/10 hover:border-primary/50 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <textarea
              value={customPrompt}
              onChange={(e) => {
                setSelectedTemplateId('custom');
                setCustomPrompt(e.target.value);
              }}
              className="w-full min-h-[95px] text-xs p-2.5 rounded-lg border border-border bg-background text-foreground focus:border-primary outline-none resize-none leading-relaxed placeholder:text-muted-foreground"
              placeholder="e.g., Help me sound calm and authoritative. Make sure I emphasize our $2M seed budget on Slide 3 and explain the ROI clearly without rushing..."
            />
          </div>

          {/* Recording Option Toggle */}
          <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-foreground">Record Practice Session</h3>
                <p className="text-[10px] text-muted-foreground">Record your microphone audio to play back and review later on the dashboard</p>
              </div>
              <button
                type="button"
                onClick={() => setRecordSession(!recordSession)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  recordSession ? 'bg-primary' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    recordSession ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Presenter Engine live interruption select */}
          {!isInterview && (
            <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground">Presentation Interaction Style</h3>
                  <p className="text-[10px] text-muted-foreground">Configure if the panel can interrupt you live or ask questions after</p>
                </div>
                <select
                  className="bg-transparent border border-border rounded-lg p-2 text-xs font-medium text-foreground outline-none focus:border-primary"
                  value={interruptionMode}
                  onChange={(e) => setInterruptionMode(e.target.value as any)}
                >
                  <option value="after" className="bg-background text-foreground">Q&A at the end</option>
                  <option value="during" className="bg-background text-foreground">Live interruptions</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Enter Stage Button */}
        <div className="max-w-2xl w-full mx-auto pt-6 border-t border-border/20">
          <Button
            size="lg"
            className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground disabled:opacity-40"
            onClick={handleStart}
            disabled={isAnalyzing || localJudges.length === 0}
          >
            {isAnalyzing ? (
              <><Loader2 className="size-4 animate-spin mr-2 inline" />Preparing Stage...</>
            ) : (
              isInterview ? 'Start Custom Q&A Panel' : 'Enter Presentation Stage'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
