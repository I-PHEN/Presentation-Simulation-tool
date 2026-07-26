'use client';

import { useEffect, useState } from 'react';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';
import { useSimulationEngine } from './use-simulation-engine';
import { SlideStage } from './SlideStage';
import { TopicStage } from './TopicStage';
import { StageCaption } from './StageCaption';
import { AudiencePanel } from './AudiencePanel';
import { TranscriptPanel } from './TranscriptPanel';
import { SimulatorToolbar } from './SimulatorToolbar';
import { nextSlideForKey } from './slide-keys';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SimSession = { id: string; deck: DeckContext; mode: DefenseMode; stance: ExaminerStance; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; status: string; source: 'deck' | 'topic' };

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || typeof element.tagName !== 'string') return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}

export function SimulatorRoom({ session, onComplete }: { session: SimSession; onComplete: () => void }) {
  const engine = useSimulationEngine(session, { onComplete });
  const [showTranscript, setShowTranscript] = useState(true);
  const [showParticipants, setShowParticipants] = useState(true);
  const isTopic = session.source === 'topic';

  const { changeSlide, position, total, phase } = engine;
  const navEnabled = !isTopic && (phase === 'live' || phase === 'introducing');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = nextSlideForKey(event.key, {
        position, total, enabled: navEnabled,
        typing: isTypingTarget(event.target),
        modified: event.metaKey || event.ctrlKey || event.altKey || event.shiftKey,
      });
      if (target === null) return;
      event.preventDefault();
      void changeSlide(target);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeSlide, navEnabled, position, total]);

  const caption = (
    <StageCaption
      text={engine.caption}
      fullText={engine.captionFull}
      speaker={engine.panel.find((persona) => persona.id === engine.captionPersonaId)?.title ?? null}
      speaking={engine.speakingPersonaId !== null}
    />
  );
  const showAside = showParticipants || showTranscript;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
        <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Exit rehearsal</a>
        <p className="min-w-0 truncate text-sm font-medium">{isTopic ? 'Topic rehearsal' : session.deck.sourceName}</p>
        <span className="shrink-0 text-sm text-muted-foreground">{isTopic ? 'Speaking to your topic' : `Slide ${position + 1} / ${total}`}</span>
      </header>

      <main className={cn(
        'grid min-h-0 w-full flex-1 gap-3 overflow-hidden p-3 sm:p-4 lg:mx-auto lg:max-w-[1600px] lg:gap-5 lg:p-5',
        showAside && 'grid-rows-[minmax(0,1fr)_minmax(0,auto)] lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-1',
      )}>
        <div className="flex min-h-0 min-w-0 flex-col">
          {isTopic
            ? <TopicStage topic={session.deck.slides[0]?.text ?? ''} caption={caption} />
            : <SlideStage slide={engine.slide} position={position} total={total} caption={caption}
                onPrev={() => void changeSlide(Math.max(0, position - 1))}
                onNext={() => void changeSlide(Math.min(total - 1, position + 1))} />}
        </div>
        {showAside && (
          <aside className="flex min-h-0 flex-col gap-3 overflow-hidden max-lg:max-h-[40dvh]">
            {showParticipants && <AudiencePanel panel={engine.panel} speakingPersonaId={engine.speakingPersonaId} />}
            {showTranscript && <TranscriptPanel segments={engine.transcript} interim={engine.interim} metrics={engine.metrics} />}
            {engine.error && <p role="alert" className="shrink-0 text-sm text-destructive">{engine.error}</p>}
          </aside>
        )}
      </main>

      <footer className="flex shrink-0 justify-center border-t border-border bg-background px-4 py-3">
        <SimulatorToolbar recording={engine.recording} micActive={engine.micActive} onToggleMic={() => void engine.toggleMic()} onToggleParticipants={() => setShowParticipants((v) => !v)} onToggleTranscript={() => setShowTranscript((v) => !v)} onEnd={() => void engine.end()} endDisabled={phase !== 'live'} />
      </footer>

      {phase === 'ready' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-xl">
          <p className="max-w-md text-center text-sm text-muted-foreground">Your panel is ready. When you press Begin, they will welcome you — then start presenting whenever you are ready.</p>
          <button type="button" onClick={() => void engine.begin()} className={cn(buttonVariants({ size: 'lg' }))}>Begin</button>
        </div>
      )}

      {phase === 'ended' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/85 backdrop-blur-xl">
          <p className="text-sm text-muted-foreground">Rehearsal complete.</p>
          <button type="button" disabled={!engine.canFinish} onClick={engine.finish} className={cn(buttonVariants({ size: 'lg' }))}>See your report</button>
        </div>
      )}
    </div>
  );
}
