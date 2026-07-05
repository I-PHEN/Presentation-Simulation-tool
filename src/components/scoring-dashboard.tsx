'use client';

import { motion } from 'framer-motion';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import {
  RotateCcw, AlertTriangle, CheckCircle2, TrendingUp, Award, BookOpen, Users, Brain,
  Eye, User, Video, Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';

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

export default function ScoringDashboard() {
  const { scores, feedback, weaknesses, recommendations, knowledgeGaps, judgeFeedback, reset, screenContext } = useAppStore();
  if (!scores) return null;

  const hasCameraData = scores.eyeContact > 0 || scores.posture > 0 || scores.cameraPresence > 0;
  const hasScreenData = screenContext.description.length > 0;

  const radarData = [
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

  const dims = [
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

  const isVerbatimWarning = scores.verbatimReading < 50;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        {/* Overall Score */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <Card className={`bg-[#111113] border ${scoreBorder(scores.overall)}`}>
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

        {/* Camera Presence + Screen Context Row */}
        {(hasCameraData || hasScreenData) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {hasCameraData && (
              <Card className="bg-[#111113] border-violet-500/15">
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
                      <div key={m.label} className="rounded-md border border-border bg-[#0c0c0e] p-2 text-center">
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
              <Card className="bg-[#111113] border-border/50">
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[11px] flex items-center gap-1.5 text-foreground">
                    <Monitor className="size-3" />
                    Screen Context
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-border bg-[#0c0c0e] p-3">
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
            <Card className="bg-[#111113] border-yellow-500/30">
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
          <Card className="bg-[#111113] border-border">
            <CardHeader className="pb-1.5">
              <CardTitle className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="size-3 text-primary" />Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={hasCameraData ? 300 : 250}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="60%">
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: '#71717a', fontSize: hasCameraData ? 8 : 9 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#52525b', fontSize: 8 }} />
                  <Radar name="Score" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.12} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-[#111113] border-border">
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
          <Card className="bg-[#111113] border-border">
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

        {/* Judge Perspectives */}
        {judgeFeedback.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="bg-[#111113] border-border">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                  <Users className="size-3 text-primary" />Judge Perspectives
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
                      className="rounded-md border border-border bg-[#0c0c0e] p-3"
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
          <Card className="bg-[#111113] border-border">
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

          <Card className="bg-[#111113] border-border">
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
            <Card className="bg-[#111113] border-orange-500/15">
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
        <div className="flex justify-center pb-6">
          <Button
            className="rounded-lg px-6 bg-primary hover:bg-primary text-primary-foreground font-semibold text-xs h-9 transition-all"
            onClick={reset}
          >
            <RotateCcw className="size-3.5 mr-1.5" />Practice again
          </Button>
        </div>
      </div>
    </div>
  );
}
