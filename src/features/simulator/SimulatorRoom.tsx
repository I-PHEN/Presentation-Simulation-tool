'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';
import { useSimulationEngine } from './use-simulation-engine';
import { SlideStage } from './SlideStage';
import { TopicStage, TOPIC_STAGE_HINT } from './TopicStage';
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
  const [maximized, setMaximized] = useState(false);
  const roomRef = useRef<HTMLDivElement>(null);
  const isTopic = session.source === 'topic';

  const { changeSlide, position, total, phase } = engine;
  const navEnabled = !isTopic && (phase === 'live' || phase === 'introducing');

  /**
   * A 16:9 slide bound by height leaves width it cannot use, so the only way to
   * grow it is to take back the vertical chrome. Maximizing hides every band and
   * asks for true fullscreen; if the browser refuses, the layout still maximizes.
   */
  const toggleMaximized = useCallback(() => {
    setMaximized((previous) => {
      if (previous) {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      } else {
        void roomRef.current?.requestFullscreen?.().catch(() => undefined);
      }
      return !previous;
    });
  }, []);

  // Esc leaves fullscreen without touching our button, so follow the browser.
  useEffect(() => {
    const onFullscreenChange = () => { if (!document.fullscreenElement) setMaximized(false); };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target);
      const modified = event.metaKey || event.ctrlKey || event.altKey || event.shiftKey;
      if (!typing && !modified && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        toggleMaximized();
        return;
      }
      const target = nextSlideForKey(event.key, { position, total, enabled: navEnabled, typing, modified });
      if (target === null) return;
      event.preventDefault();
      void changeSlide(target);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [changeSlide, navEnabled, position, total, toggleMaximized]);

  const showAside = !maximized && (showParticipants || showTranscript);
  const hearing = engine.interim.trim().length > 0;

  return (
    <div ref={roomRef} className="relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {!maximized && (
        <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-3 sm:px-4">
          <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Exit rehearsal</a>
          <p className="min-w-0 truncate text-sm font-medium">{isTopic ? 'Topic rehearsal' : session.deck.sourceName}</p>
          <span className="shrink-0 text-sm text-muted-foreground">{isTopic ? 'Speaking to your topic' : `Slide ${position + 1} / ${total}`}</span>
        </header>
      )}

      {/* One screen: the stage owns a 1fr row, the aside is capped and scrolls inside.
          Every band here is kept as thin as it can be - the height it does not take
          is height the slide gets. */}
      <main className={cn(
        'grid min-h-0 w-full flex-1 grid-rows-1 overflow-hidden',
        maximized ? 'gap-0 p-0' : 'gap-2 p-2 lg:mx-auto lg:max-w-[1600px] lg:gap-3',
        showAside && 'max-lg:grid-rows-[minmax(0,1fr)_minmax(0,auto)] lg:grid-cols-[minmax(0,1fr)_22rem]',
      )}>
        <div className={cn('flex min-h-0 min-w-0 flex-col', !maximized && 'gap-2')}>
          {isTopic
            ? <TopicStage topic={session.deck.slides[0]?.text ?? ''} />
            : <SlideStage slide={engine.slide} position={position} total={total} />}
          <StageCaption
            text={engine.caption}
            fullText={engine.captionFull}
            speaker={engine.panel.find((persona) => persona.id === engine.captionPersonaId)?.title ?? null}
            speaking={engine.speakingPersonaId !== null}
            idleText={isTopic ? TOPIC_STAGE_HINT : engine.slide?.text}
            overlay={maximized}
          />
        </div>
        {showAside && (
          <aside className="flex min-h-0 flex-col gap-3 overflow-hidden max-lg:max-h-[40dvh]">
            {showParticipants && <AudiencePanel panel={engine.panel} speakingPersonaId={engine.speakingPersonaId} self={{ micActive: engine.micActive, hearing }} />}
            {showTranscript && <TranscriptPanel segments={engine.transcript} interim={engine.interim} metrics={engine.metrics} />}
            {engine.error && <p role="alert" className="shrink-0 text-sm text-destructive">{engine.error}</p>}
          </aside>
        )}
      </main>

      {/* Maximized, the toolbar floats over the slide instead of taking a band. */}
      <footer className={cn('flex justify-center',
        maximized
          ? 'pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-3'
          : 'shrink-0 border-t border-border bg-background px-4 py-2',
      )}>
        <SimulatorToolbar recording={engine.recording} micActive={engine.micActive} hearing={hearing} maximized={maximized} onToggleMaximized={toggleMaximized} onToggleMic={() => void engine.toggleMic()} onToggleParticipants={() => setShowParticipants((v) => !v)} onToggleTranscript={() => setShowTranscript((v) => !v)} onEnd={() => void engine.end()} endDisabled={phase !== 'live'}
          slideNav={isTopic ? undefined : {
            onPrev: () => void changeSlide(Math.max(0, position - 1)),
            onNext: () => void changeSlide(Math.min(total - 1, position + 1)),
            prevDisabled: position === 0,
            nextDisabled: position >= total - 1,
          }} />
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
