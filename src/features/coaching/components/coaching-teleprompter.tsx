'use client';

import { FileText, Volume2, RefreshCw, Play } from 'lucide-react';
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
    ? 'Topic Delivery Guide & Spoken Talking Points'
    : `Slide ${currentSlide + 1} Talking Points & Script`;

  const fallbackHook = isTopicSession
    ? 'State your core thesis clearly with high conviction.'
    : 'Capture attention immediately with your main takeaway.';

  const fallbackPoints = isTopicSession
    ? [
        'Establish the core bottleneck or problem immediately.',
        'Detail your strategic solution and key evidence points.',
        'Conclude with a clear call to action and vision.',
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
    <div className="h-48 border-t border-border bg-card p-4 overflow-y-auto shrink-0 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            {headerLabel}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={isPlayingDemo}
          onClick={onPlayDemo}
          className="h-7 text-xs"
        >
          <Volume2 className="size-3.5 mr-1" /> {isPlayingDemo ? 'Speaking...' : 'Demonstrate Delivery'}
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 text-center text-xs text-muted-foreground italic flex items-center justify-center gap-2">
          <RefreshCw className="size-4 animate-spin text-primary" /> Generating talking points for {isTopicSession ? 'Topic' : `Slide ${currentSlide + 1}`}...
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          <div className="p-2 rounded-md bg-muted/60 border border-border text-foreground font-medium flex items-center gap-2">
            <Play className="size-3 text-primary shrink-0" />
            <span>Hook: &ldquo;{activeScript.openingHook}&rdquo;</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {activeScript.talkingPoints.map((point, idx) => (
              <div key={idx} className="p-2.5 rounded-md border border-border bg-surface text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground mr-1">{idx + 1}.</span> {point}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
