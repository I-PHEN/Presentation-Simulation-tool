'use client';

import { FileText, Volume2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SlideScriptData } from '../types';

interface CoachingTeleprompterProps {
  currentSlide: number;
  script?: SlideScriptData;
  isLoading: boolean;
  isPlayingDemo: boolean;
  onPlayDemo: () => void;
  isTopicSession?: boolean;
}

export function CoachingTeleprompter({
  currentSlide,
  script,
  isLoading,
  isPlayingDemo,
  onPlayDemo,
  isTopicSession = false,
}: CoachingTeleprompterProps) {
  const headerLabel = isTopicSession
    ? 'Topic Delivery Guide & Spoken Triad'
    : `Slide ${currentSlide + 1} Delivery Guide & Talking Points`;

  const fallbackHook = isTopicSession
    ? 'State your core thesis clearly with high conviction in the first 15 seconds.'
    : 'Capture attention immediately with your main takeaway.';

  const fallbackPoints = isTopicSession
    ? [
        'Context: Establish the core bottleneck or problem immediately.',
        'Solution: Detail your strategic solution & key evidence points.',
        'Impact: Conclude with a clear call to action and vision.',
      ]
    : [
        'Highlight key metric or core claim.',
        'Provide supporting technical or market context.',
        'Transition smoothly to the next slide topic.',
      ];

  const activeScript = script || {
    openingHook: fallbackHook,
    talkingPoints: fallbackPoints,
    rescueScript: fallbackHook,
  };

  return (
    <div className="h-44 border-t border-border bg-card/90 backdrop-blur p-3.5 overflow-y-auto shrink-0 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground tracking-tight">
            {headerLabel}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={isPlayingDemo}
          onClick={onPlayDemo}
          className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
        >
          <Volume2 className="size-3 mr-1" /> {isPlayingDemo ? 'Speaking...' : 'Demonstrate Delivery'}
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 text-center text-xs text-muted-foreground italic flex items-center justify-center gap-2">
          <RefreshCw className="size-4 animate-spin text-primary" /> Generating speech guidance...
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-foreground font-medium flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary shrink-0" />
            <span className="text-xs"><strong className="text-primary font-semibold">Hook (0-15s):</strong> &ldquo;{activeScript.openingHook}&rdquo;</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {activeScript.talkingPoints.slice(0, 3).map((point, idx) => (
              <div key={idx} className="px-3 py-2 rounded-md border border-border bg-surface text-muted-foreground leading-relaxed text-[11px]">
                <span className="font-semibold text-foreground mr-1">{idx + 1}.</span> {point}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
