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

const judgePresets = [
  { id: 'investor', icon: <Briefcase className="size-4" />, title: 'Investor', desc: 'Business model & ROI', type: 'investor' },
  { id: 'executive', icon: <Building className="size-4" />, title: 'Executive', desc: 'Strategy & risk', type: 'executive' },
  { id: 'professor', icon: <GraduationCap className="size-4" />, title: 'Professor', desc: 'Methodology & rigor', type: 'professor' },
  { id: 'hackathon_judge', icon: <Target className="size-4" />, title: 'Hackathon Judge', desc: 'Innovation & implementation', type: 'hackathon_judge' },
  { id: 'customer', icon: <ShoppingCart className="size-4" />, title: 'Customer', desc: 'Value & usability', type: 'customer' },
];

const studentPresets = [
  { id: 'student_curious', icon: <HelpCircle className="size-4" />, title: 'Curious Student', desc: 'Asks "why" questions', type: 'student' },
  { id: 'student_skeptical', icon: <Search className="size-4" />, title: 'Skeptical Student', desc: 'Challenges claims', type: 'student' },
  { id: 'student_confused', icon: <AlertCircle className="size-4" />, title: 'Confused Student', desc: 'Needs clarification', type: 'student' },
  { id: 'student_keen', icon: <Hand className="size-4" />, title: 'Keen Student', desc: 'Eager to participate', type: 'student' },
];

const modeOptions: { mode: PracticeMode; label: string; desc: string; icon: typeof Users }[] = [
  { mode: 'full', label: 'Full Presentation', desc: 'No time limit', icon: Users },
  { mode: 'pitch', label: '3-Min Pitch', desc: 'Elevator pitch', icon: Zap },
  { mode: 'impromptu', label: 'Impromptu', desc: 'Random topic, 2 min', icon: Mic },
  { mode: 'lecture', label: 'Lecture Mode', desc: 'Teach a class', icon: GraduationCap },
];

const MAX_AUDIENCE = 8;
const MIN_AUDIENCE = 1;

export default function ConfigureSection() {
  const {
    title, content, audienceType, setAudienceType, judges, setJudges,
    interruptionMode, setInterruptionMode, practiceMode, setPracticeMode,
    isAnalyzing, setIsAnalyzing, setStep, setSessionId, hasContent,
    inputMode, audienceCount, setAudienceCount,
  } = useAppStore();

  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>(
    judges.map(j => j.id)
  );

  const isLecture = practiceMode === 'lecture';
  const activePresets = isLecture ? studentPresets : judgePresets;

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
        const bands = [];
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

  const toggleJudge = (preset: typeof judgePresets[0]) => {
    setSelectedJudgeIds(prev => {
      const next = prev.includes(preset.id)
        ? prev.filter(id => id !== preset.id)
        : prev.length >= audienceCount
        ? prev
        : [...prev, preset.id];
      return next;
    });
  };

  const handleStart = async () => {
    if (selectedJudgeIds.length === 0) {
      toast.error(isLecture ? 'Select at least one student' : 'Select at least one audience member');
      return;
    }

    stopMicTest();

    const selectedJudges: Judge[] = selectedJudgeIds.map(id => {
      const preset = activePresets.find(p => p.id === id)!;
      // We store the icon as a string if we need to serialize it, but we can just use the type later.
      // For now we'll pass a string representation or leave it as ReactNode if `icon` type in Judge is any.
      return { id: preset.id, icon: preset.title.charAt(0), title: preset.title, type: preset.type, voice: getVoiceForJudge(preset.type) };
    });
    setJudges(selectedJudges);

    const primaryType = selectedJudges[0].type;
    setAudienceType(primaryType);

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, audienceType: primaryType, practiceMode }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessionId(data.sessionId);
      setStep(3);
    } catch {
      toast.error('Failed to set up session');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex items-stretch bg-background">
      {/* Left: Interactive Stage Preview */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-8 relative border-r border-border/50 bg-[#070708] overflow-y-auto">
        {/* Stage Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Stage Preview
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Testing equipment and preparing audience
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-full bg-[#111113] border border-border/50 text-[11px] font-semibold text-primary flex items-center gap-1.5 animate-pulse">
            <Zap className="size-3" />
            {practiceModeConfig[practiceMode]?.label}
          </div>
        </div>

        {/* Selected Audience Grid (Middle Section) */}
        <div className="my-8 flex-1 flex flex-col justify-center">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isLecture ? 'Student Seating Panel' : 'Audience Boardroom Seating'}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {selectedJudgeIds.length} / {audienceCount} active
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: audienceCount }).map((_, index) => {
              const judgeId = selectedJudgeIds[index];
              const judge = judgeId ? activePresets.find(p => p.id === judgeId) : null;

              if (judge) {
                return (
                  <motion.div
                    key={judge.id}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative group rounded-xl bg-[#111113] border border-primary/20 shadow-lg p-4 flex flex-col items-center justify-center text-center transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)]"
                  >
                    <div className="size-12 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center text-primary text-xl mb-3 shadow-inner group-hover:scale-105 transition-transform duration-300">
                      {judge.icon}
                    </div>
                    <span className="text-xs font-bold text-foreground truncate w-full">{judge.title}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 truncate w-full">{judge.desc}</span>

                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded text-[8px] font-medium uppercase tracking-wider">
                      Ready
                    </div>
                  </motion.div>
                );
              }

              return (
                <div
                  key={`empty-${index}`}
                  className="rounded-xl border border-dashed border-border/60 bg-transparent p-4 flex flex-col items-center justify-center text-center opacity-60"
                >
                  <div className="size-12 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground mb-3">
                    <Users className="size-5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Empty Seat</span>
                  <span className="text-[9px] text-muted-foreground/80 mt-0.5">Select on right</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Gear & Settings Check */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border/30">
          {/* Live Mic Test Card */}
          <div className="rounded-xl border border-border/50 bg-[#111113] p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${isTestingMic ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Mic className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Microphone Check</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isTestingMic ? 'Device recording live' : 'Verify audio signal'}
                  </p>
                </div>
              </div>

              {isTestingMic && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div className="h-12 my-3 bg-[#0a0a0c] rounded-lg border border-border/40 flex items-center justify-center px-4 relative overflow-hidden">
              {micError ? (
                <p className="text-[10px] text-destructive font-medium text-center px-2">{micError}</p>
              ) : isTestingMic ? (
                <div className="flex items-end justify-center gap-0.5 w-full h-8">
                  {frequencies.map((freq, i) => {
                    const heightPercent = Math.max(8, Math.round((freq / 255) * 100));
                    return (
                      <motion.div
                        key={i}
                        className="w-1.5 bg-primary rounded-t"
                        style={{ height: `${heightPercent}%` }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center">Click Test to start signal</p>
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

          {/* Session Overview Card */}
          <div className="rounded-xl border border-border/50 bg-[#111113] p-4 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                  <Monitor className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Session Overview</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Presentation configuration</p>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Presentation Title:</span>
                  <span className="font-semibold text-foreground truncate max-w-[120px]">{title || 'Untitled'}</span>
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
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Interaction:</span>
                  <span className="font-semibold text-foreground">
                    {interruptionMode === 'during' ? 'Live interruptions' : 'Q&A at the end'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-muted-foreground/80 pt-2 border-t border-border/20 mt-2 text-center">
              All settings synced with dashboard
            </div>
          </div>
        </div>
      </div>

      {/* Right: Settings Sidebar */}
      <div className="w-full lg:w-[480px] flex flex-col bg-surface overflow-y-auto">
        <div className="p-8 flex-1">
          <div className="flex items-center gap-3 mb-10">
            <button
              onClick={() => setStep(1)}
              className="size-8 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="size-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Session Setup
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {title || 'Untitled'}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Mode */}
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4 block">
                Practice Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                {modeOptions.map((opt) => {
                  const selected = practiceMode === opt.mode;
                  const Icon = opt.icon;
                  const disabled = opt.mode !== 'impromptu' && opt.mode !== 'lecture' && !hasContent && inputMode === 'upload';
                  return (
                    <button
                      key={opt.mode}
                      onClick={() => {
                        if (!disabled) {
                          setPracticeMode(opt.mode);
                          setSelectedJudgeIds([]);
                        }
                      }}
                      disabled={disabled}
                      className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all ${
                        selected
                          ? 'bg-primary/5 border-primary ring-1 ring-primary'
                          : disabled
                          ? 'bg-transparent border-border/50 opacity-50 cursor-not-allowed'
                          : 'bg-transparent border-border hover:bg-muted/50'
                      }`}
                    >
                      <Icon className={`size-4 mb-2 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-semibold ${selected ? 'text-foreground' : 'text-foreground/80'}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audience Count & Behavior */}
            <div className="flex gap-6">
              <div className="flex-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4 block">
                  {isLecture ? 'Students' : 'Audience Size'}
                </label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setAudienceCount(Math.max(MIN_AUDIENCE, audienceCount - 1))} disabled={audienceCount <= MIN_AUDIENCE} className="size-8 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-25 transition-colors">
                    <Minus className="size-4 text-muted-foreground" />
                  </button>
                  <span className="text-lg font-mono font-semibold text-foreground w-6 text-center">{audienceCount}</span>
                  <button onClick={() => setAudienceCount(Math.min(MAX_AUDIENCE, audienceCount + 1))} disabled={audienceCount >= MAX_AUDIENCE} className="size-8 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-25 transition-colors">
                    <Plus className="size-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4 block">
                  Interaction
                </label>
                <select
                  className="w-full bg-transparent border border-border rounded-lg p-2.5 text-sm font-medium text-foreground outline-none focus:border-primary"
                  value={interruptionMode}
                  onChange={(e) => setInterruptionMode(e.target.value as any)}
                >
                  <option value="after" className="bg-[#111113]">Q&A at the end</option>
                  <option value="during" className="bg-[#111113]">Live interruptions</option>
                </select>
              </div>
            </div>

            {/* Audience Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  {isLecture ? 'Select Students' : 'Select Audience'}
                </label>
                <span className="text-xs text-muted-foreground">{selectedJudgeIds.length} / {audienceCount}</span>
              </div>
              
              <div className="space-y-2">
                {activePresets.map((preset) => {
                  const selected = selectedJudgeIds.includes(preset.id);
                  const atLimit = selectedJudgeIds.length >= audienceCount;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => toggleJudge(preset)}
                      className={`w-full flex items-center gap-4 p-3 rounded-lg border text-left transition-all ${
                        selected
                          ? 'bg-primary/5 border-primary/50 ring-1 ring-primary/50'
                          : atLimit
                          ? 'bg-transparent border-border/50 opacity-50 cursor-not-allowed'
                          : 'bg-transparent border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className={`size-10 flex items-center justify-center rounded-md border ${selected ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-[#111113] border-border text-muted-foreground'}`}>
                        {preset.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${selected ? 'text-foreground' : 'text-foreground/90'}`}>
                          {preset.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{preset.desc}</p>
                      </div>
                      {selected && <Check className="size-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Action Footer */}
        <div className="p-8 border-t border-border bg-[#0a0a0c]">
          <Button
            size="lg"
            className="w-full h-14 text-base font-bold bg-primary text-primary-foreground disabled:opacity-40"
            onClick={handleStart}
            disabled={isAnalyzing || selectedJudgeIds.length === 0}
          >
            {isAnalyzing ? (
              <><Loader2 className="size-5 animate-spin mr-2 inline" />Preparing Stage...</>
            ) : (
              'Enter Stage'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
