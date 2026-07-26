'use client';

import { useRef } from 'react';
import { SessionAudioPlayer, type SessionAudioPlayerHandle } from '@/features/simulator/SessionAudioPlayer';
import { MetricsStrip } from './MetricsStrip';
import { EvidenceTimeline } from './EvidenceTimeline';
import { PersonaVerdictCards } from './PersonaVerdictCards';
import { DrillsPanel } from './DrillsPanel';
import type { CoachingReport } from '@/features/defense/types';

export function CoachingReportView({ report, audioPath, retryHref = '/rehearse' }: { report: CoachingReport; audioPath?: string | null; retryHref?: string }) {
  const playerRef = useRef<SessionAudioPlayerHandle>(null);
  const onSeek = (ms: number) => playerRef.current?.seekTo(ms / 1000);
  return (
    <div className="space-y-8 text-sm leading-6">
      <header className="rounded-xl border border-border bg-card p-6 shadow-e1">
        <p className="text-muted-foreground">Highest-leverage issue</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl font-medium tracking-tight">{report.highestLeverage.title}</h1>
        <p className="mt-2">{report.highestLeverage.evidence}</p>
      </header>
      <SessionAudioPlayer ref={playerRef} audioPath={audioPath} />
      <MetricsStrip metrics={report.metrics} onSeek={onSeek} />
      {report.timeline.length > 0 ? <EvidenceTimeline timeline={report.timeline} onSeek={onSeek} deckless={report.metrics.deckless} /> : null}
      <PersonaVerdictCards verdicts={report.personaVerdicts} onSeek={onSeek} deckless={report.metrics.deckless} />
      <DrillsPanel drills={report.drills} retryHref={retryHref} />
      {report.strengths.length > 0 ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
          <h2 className="text-lg font-semibold text-foreground">Strengths</h2>
          <ul className="mt-4 list-disc pl-5 space-y-1 marker:text-muted-foreground">{report.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
