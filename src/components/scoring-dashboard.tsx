import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import {
  RotateCcw, AlertTriangle, CheckCircle2, TrendingUp, Award, BookOpen, Users, Brain,
  Eye, User, Video, Monitor, Home, Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

function scoreColor(s: number) {
  if (s >= 70) return 'text-success';
  if (s >= 40) return 'text-yellow-400';
  return 'text-red-400';
}
function scoreBar(s: number) {
  if (s >= 70) return 'bg-emerald-500';
  if (s >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}
function scoreLabel(s: number) {
  if (s >= 90) return 'Excellent';
  if (s >= 70) return 'Good';
  if (s >= 40) return 'Needs Work';
  return 'Needs Improvement';
}
function scoreBorder(s: number) {
  if (s >= 70) return 'border-success/20';
  if (s >= 40) return 'border-yellow-500/20';
  return 'border-red-500/20';
}

interface DashboardProps {
  sessionData?: {
    practiceMode: string;
    scores: {
      clarity: number;
      confidence: number;
      technical: number;
      storytelling: number;
      persuasiveness: number;
      conciseness: number;
      verbatimReading: number;
      eyeContact: number;
      posture: number;
      cameraPresence: number;
      overall: number;
    };
    feedback: string;
    weaknesses: string[];
    recommendations: string[];
    knowledgeGaps: string[];
    judgeFeedback: Array<{ judgeType: string; icon: string; title: string; feedback: string }>;
    screenContextDescription?: string;
    audioPath?: string;
  };
}

export default function ScoringDashboard({ sessionData }: DashboardProps = {}) {
  const router = useRouter();
  const storeData = useAppStore();

  const [loadedAudioPath, setLoadedAudioPath] = useState<string | null>(null);

  const isHistorical = !!sessionData;

  useEffect(() => {
    if (isHistorical && sessionData?.audioPath) {
      setLoadedAudioPath(sessionData.audioPath);
    } else if (!isHistorical && storeData.sessionId) {
      const fetchSessionAudio = async () => {
        try {
          const res = await fetch(`/api/session/${storeData.sessionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.session?.audioPath) {
              setLoadedAudioPath(data.session.audioPath);
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      const timer = setTimeout(fetchSessionAudio, 1500);
      return () => clearTimeout(timer);
    }
  }, [isHistorical, sessionData, storeData.sessionId]);

  const practiceMode = isHistorical ? sessionData.practiceMode : storeData.practiceMode;
  const scores = isHistorical ? sessionData.scores : storeData.scores;
  const feedback = isHistorical ? sessionData.feedback : storeData.feedback;
  const weaknesses = isHistorical ? sessionData.weaknesses : storeData.weaknesses;
  const recommendations = isHistorical ? sessionData.recommendations : storeData.recommendations;
  const knowledgeGaps = isHistorical ? sessionData.knowledgeGaps : storeData.knowledgeGaps;
  const judgeFeedback = isHistorical ? sessionData.judgeFeedback : storeData.judgeFeedback;
  const screenContext = isHistorical ? { description: sessionData.screenContextDescription || '', updatedAt: 0 } : storeData.screenContext;
  const reset = storeData.reset;

  if (!scores) return null;

  const isInterview = practiceMode === 'interview';
  const hasCameraData = scores.eyeContact > 0 || scores.posture > 0 || scores.cameraPresence > 0;
  const hasScreenData = screenContext.description.length > 0;

  const radarData = isInterview
    ? [
        { dimension: 'Communication', score: scores.clarity, fullMark: 100 },
        { dimension: 'Confidence', score: scores.confidence, fullMark: 100 },
        { dimension: 'Technical Rigor', score: scores.technical, fullMark: 100 },
        { dimension: 'STAR Method', score: scores.storytelling, fullMark: 100 },
        { dimension: 'Culture Fit', score: scores.persuasiveness, fullMark: 100 },
        { dimension: 'Conciseness', score: scores.conciseness, fullMark: 100 },
        ...(hasCameraData ? [
          { dimension: 'Eye Contact', score: scores.eyeContact, fullMark: 100 },
          { dimension: 'Posture', score: scores.posture, fullMark: 100 },
          { dimension: 'Presence', score: scores.cameraPresence, fullMark: 100 },
        ] : []),
      ]
    : [
        { dimension: 'Clarity', score: scores.clarity, fullMark: 100 },
        { dimension: 'Confidence', score: scores.confidence, fullMark: 100 },
        { dimension: 'Technical', score: scores.technical, fullMark: 100 },
        { dimension: 'Storytelling', score: scores.storytelling, fullMark: 100 },
        { dimension: 'Persuasion', score: scores.persuasiveness, fullMark: 100 },
        { dimension: 'Concise', score: scores.conciseness, fullMark: 100 },
        { dimension: 'Verbatim', score: scores.verbatimReading, fullMark: 100 },
        ...(hasCameraData ? [
          { dimension: 'Eye Contact', score: scores.eyeContact, fullMark: 100 },
          { dimension: 'Posture', score: scores.posture, fullMark: 100 },
          { dimension: 'Presence', score: scores.cameraPresence, fullMark: 100 },
        ] : []),
      ];

  const dims = isInterview
    ? [
        { label: 'Communication', score: scores.clarity, icon: null },
        { label: 'Poise & Confidence', score: scores.confidence, icon: null },
        { label: 'Technical Rigor', score: scores.technical, icon: null },
        { label: 'STAR Method Alignment', score: scores.storytelling, icon: null },
        { label: 'Culture Fit', score: scores.persuasiveness, icon: null },
        { label: 'Conciseness', score: scores.conciseness, icon: null },
        ...(hasCameraData ? [
          { label: 'Eye Contact', score: scores.eyeContact, icon: <Eye className="size-3 text-chart-2" /> },
          { label: 'Posture', score: scores.posture, icon: <User className="size-3 text-chart-2" /> },
          { label: 'Camera Presence', score: scores.cameraPresence, icon: <Video className="size-3 text-chart-2" /> },
        ] : []),
      ]
    : [
        { label: 'Clarity', score: scores.clarity, icon: null },
        { label: 'Confidence', score: scores.confidence, icon: null },
        { label: 'Technical', score: scores.technical, icon: null },
        { label: 'Storytelling', score: scores.storytelling, icon: null },
        { label: 'Persuasiveness', score: scores.persuasiveness, icon: null },
        { label: 'Conciseness', score: scores.conciseness, icon: null },
        { label: 'Verbatim Reading', score: scores.verbatimReading, icon: <BookOpen className="size-3 text-yellow-400" /> },
        ...(hasCameraData ? [
          { label: 'Eye Contact', score: scores.eyeContact, icon: <Eye className="size-3 text-chart-2" /> },
          { label: 'Posture', score: scores.posture, icon: <User className="size-3 text-chart-2" /> },
          { label: 'Camera Presence', score: scores.cameraPresence, icon: <Video className="size-3 text-chart-2" /> },
        ] : []),
      ];

  const isVerbatimWarning = !isInterview && scores.verbatimReading < 50;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        {/* Overall Score */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <Card className={`bg-card border ${scoreBorder(scores.overall)}`}>
            <CardContent className="pt-5 flex flex-col items-center text-center">
              <Award className={`size-6 mb-1.5 ${scoreColor(scores.overall)}`} />
              <div className={`text-5xl font-bold tabular-nums ${scoreColor(scores.overall)}`}>
                {scores.overall}
              </div>
              <p className="text-sm font-medium text-foreground mt-0.5">Overall</p>
              <p className={`text-xs font-medium ${scoreColor(scores.overall)}`}>{scoreLabel(scores.overall)}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Audio Session Recording Replay player */}
        {loadedAudioPath && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }}>
            <Card className="bg-card border-border shadow-sm">
              <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Volume2 className="size-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Session Recording Playback</h4>
                    <p className="text-[10px] text-muted-foreground">Listen back to your actual speech audio from this practice session</p>
                  </div>
                </div>
                <div className="flex-1 w-full sm:max-w-md">
                  <audio
                    src={loadedAudioPath}
                    controls
                    className="w-full h-8 bg-transparent text-foreground [&::-webkit-media-controls-panel]:bg-zinc-900/90 [&::-webkit-media-controls-current-time-display]:text-zinc-200 [&::-webkit-media-controls-time-remaining-display]:text-zinc-400"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Camera Presence + Screen Context Row */}
        {(hasCameraData || hasScreenData) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {hasCameraData && (
              <Card className="bg-card border-violet-500/15">
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[11px] flex items-center gap-1.5 text-chart-2">
                    <Video className="size-3" />
                    Camera Presence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: <Eye className="size-4" />, label: 'Eye Contact', score: scores.eyeContact },
                      { icon: <User className="size-4" />, label: 'Posture', score: scores.posture },
                      { icon: <Video className="size-4" />, label: 'Presence', score: scores.cameraPresence },
                    ].map((m) => (
                      <div key={m.label} className="rounded-md border border-border bg-muted p-2 text-center">
                        <div className={scoreColor(m.score)}>{m.icon}</div>
                        <p className={`text-lg font-bold tabular-nums mt-0.5 ${scoreColor(m.score)}`}>{m.score}</p>
                        <p className="text-[9px] text-muted-foreground">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {hasScreenData && (
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[11px] flex items-center gap-1.5 text-foreground">
                    <Monitor className="size-3" />
                    Screen Context
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border bg-muted p-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">{screenContext.description}</p>
                    <p className="text-[9px] text-muted-foreground mt-1.5">
                      Updated {new Date(screenContext.updatedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Verbatim Alert */}
        {isVerbatimWarning && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="bg-card border-yellow-500/30">
              <CardContent className="pt-4 flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-400 mb-0.5">Verbatim reading detected</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You appear to be reading slides directly. Explain concepts in your own words for a more compelling presentation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Radar + Breakdown */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="bg-card border-border">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="size-3 text-primary" />Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={hasCameraData ? 300 : 250}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="60%">
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: 'var(--color-muted-foreground)', fontSize: hasCameraData ? 8 : 9 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--color-muted-foreground)', fontSize: 8 }} />
                  <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.12} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-[11px] text-muted-foreground">Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dims.map((d) => (
                <div key={d.label} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      {d.icon}
                      {d.label}
                    </span>
                    <span className={`text-[11px] font-semibold tabular-nums ${scoreColor(d.score)}`}>{d.score}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.score}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${scoreBar(d.score)}`}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Feedback */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="bg-card border-border">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="size-3 text-primary" />Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">{feedback}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Judge/Interviewer Perspectives */}
        {judgeFeedback.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="bg-card border-border">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-3 text-primary" />{isInterview ? 'Interviewer Perspectives' : 'Judge Perspectives'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {judgeFeedback.map((jf, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.04 }}
                      className="rounded-md border border-border bg-muted p-3"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">{jf.icon}</span>
                        <span className="text-[11px] font-medium text-foreground">{jf.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{jf.feedback}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Weaknesses + Recommendations */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card className="bg-card border-border">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="size-3 text-yellow-400" />Weaknesses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <AlertTriangle className="size-3 text-yellow-400/50 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{w}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="size-3 text-success" />Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <CheckCircle2 className="size-3 text-success/50 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{r}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Knowledge Gaps */}
        {knowledgeGaps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="bg-card border-orange-500/15">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                  <Brain className="size-3 text-orange-400" />Knowledge Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {knowledgeGaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs">
                      <Brain className="size-3 text-orange-400/50 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{g}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Practice Again */}
        {!isHistorical && (
          <div className="flex justify-center gap-3 pb-6">
            <Button
              variant="outline"
              className="rounded-lg px-5 text-xs h-9 transition-all"
              onClick={() => {
                reset();
                router.push('/dashboard');
              }}
            >
              <Home className="size-3.5 mr-1.5" /> Dashboard
            </Button>
            <Button
              className="rounded-lg px-5 bg-primary hover:bg-primary text-primary-foreground font-semibold text-xs h-9 transition-all"
              onClick={reset}
            >
              <RotateCcw className="size-3.5 mr-1.5" />Practice again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
