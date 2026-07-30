'use client';

import { Mic, MicOff, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoachingControlsProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  onFinish: () => void;
  onAskCoach?: () => void;
  isAskingCoach?: boolean;
}

export function CoachingControls({
  isRecording,
  onToggleRecording,
  onFinish,
  onAskCoach,
  isAskingCoach = false,
}: CoachingControlsProps) {
  return (
    <div className="h-14 border-t border-border bg-card px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Button
          onClick={onToggleRecording}
          variant={isRecording ? 'destructive' : 'default'}
          size="sm"
          className="font-medium text-xs flex items-center gap-2"
        >
          {isRecording ? (
            <><MicOff className="size-4 animate-pulse" /> Stop Recording</>
          ) : (
            <><Mic className="size-4" /> Start Mic Recording</>
          )}
        </Button>

        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border ${
          isRecording 
            ? 'bg-red-500/10 text-red-400 border-red-500/30' 
            : 'bg-muted text-muted-foreground border-border'
        }`}>
          <span className={`size-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-muted-foreground'}`} />
          {isRecording ? 'LIVE RECORDING ON' : 'RECORDING OFF'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onAskCoach && (
          <Button
            onClick={onAskCoach}
            disabled={isAskingCoach}
            variant="outline"
            size="sm"
            className="font-medium text-xs flex items-center gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Sparkles className="size-3.5" />
            {isAskingCoach ? 'Coach Thinking...' : 'Ask Coach for Advice'}
          </Button>
        )}

        <Button
          onClick={onFinish}
          variant="secondary"
          size="sm"
          className="font-medium text-xs flex items-center gap-2"
        >
          Finish Rehearsal <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
