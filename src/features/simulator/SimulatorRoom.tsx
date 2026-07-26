'use client';

import { useState } from 'react';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';
import { useSimulationEngine } from './use-simulation-engine';
import { SlideStage } from './SlideStage';
import { TopicStage } from './TopicStage';
import { AudiencePanel } from './AudiencePanel';
import { TranscriptPanel } from './TranscriptPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SimSession = { id: string; deck: DeckContext; mode: DefenseMode; stance: ExaminerStance; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; status: string; source: 'deck' | 'topic' };

export function SimulatorRoom({ session, onComplete }: { session: SimSession; onComplete: () => void }) {
  const engine = useSimulationEngine(session, { onComplete });
  const [showTranscript, setShowTranscript] = useState(true);
  const [showParticipants, setShowParticipants] = useState(true);
  const isTopic = session.source === 'topic';

  return (
    <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
        <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Exit rehearsal</a>
        <p className="min-w-0 truncate text-sm font-medium">{isTopic ? 'Topic rehearsal' : session.deck.sourceName}</p>
        <span className="text-sm text-muted-foreground">{isTopic ? 'Speaking to your topic' : `Slide ${engine.position + 1} / ${engine.total}`}</span>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] flex-1 gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-6">
        <div className="flex min-w-0 flex-col gap-4">
          {isTopic
            ? <TopicStage topic={session.deck.slides[0]?.text ?? ''} />
            : <SlideStage slide={engine.slide} position={engine.position} total={engine.total} onPrev={() => void engine.changeSlide(Math.max(0, engine.position - 1))} onNext={() => void engine.changeSlide(Math.min(engine.total - 1, engine.position + 1))} />}
          {showTranscript && <div className="lg:hidden"><TranscriptPanel segments={engine.transcript} interim={engine.interim} metrics={engine.metrics} /></div>}
        </div>
        <aside className="flex flex-col gap-4">
          {showParticipants && <AudiencePanel panel={engine.panel} speakingPersonaId={engine.speakingPersonaId} caption={engine.caption} />}
          {showTranscript && <div className="hidden lg:block"><TranscriptPanel segments={engine.transcript} interim={engine.interim} metrics={engine.metrics} /></div>}
          {engine.error && <p role="alert" className="text-sm text-destructive">{engine.error}</p>}
        </aside>
      </main>

      {engine.phase === 'ready' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-xl">
          <p className="max-w-md text-center text-sm text-muted-foreground">Your panel is ready. When you press Begin, they will welcome you — then start presenting whenever you are ready.</p>
          <button type="button" onClick={() => void engine.begin()} className={cn(buttonVariants({ size: 'lg' }))}>Begin</button>
        </div>
      )}

      <footer className="pointer-events-none sticky bottom-0 flex justify-center p-4">
        <SimulatorToolbar recording={engine.recording} micActive={engine.micActive} onToggleMic={() => void engine.toggleMic()} onToggleParticipants={() => setShowParticipants((v) => !v)} onToggleTranscript={() => setShowTranscript((v) => !v)} onEnd={() => void engine.end()} endDisabled={engine.phase !== 'live'} />
      </footer>

      {engine.phase === 'ended' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Rehearsal complete.</p>
          <button type="button" disabled={!engine.canFinish} onClick={engine.finish} className={cn(buttonVariants({ size: 'lg' }))}>See your report</button>
        </div>
      )}
    </div>
  );
}
