'use client';

import { Mic, MicOff, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoachingControlsProps {
  isMicOn: boolean;
  onToggleMic: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  onFinish: () => void;
}

export function CoachingControls({
  isMicOn,
  onToggleMic,
  isRecording,
  onToggleRecording,
  onFinish,
}: CoachingControlsProps) {
  return (
    <div className="h-14 border-t border-border bg-card px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Practice Mic Toggle */}
        <Button
          onClick={onToggleMic}
          variant={isMicOn ? 'secondary' : 'outline'}
          size="sm"
          className="font-medium text-xs flex items-center gap-2"
        >
          {isMicOn ? (
            <><MicOff className="size-4 text-primary" /> Turn Off Mic</>
          ) : (
            <><Mic className="size-4" /> Practice Mic (Speech Active)</>
          )}
        </Button>

        {/* Record Attempt Toggle */}
        <Button
          onClick={onToggleRecording}
          variant={isRecording ? 'destructive' : 'default'}
          size="sm"
          className="font-medium text-xs flex items-center gap-2"
        >
          {isRecording ? (
            <><MicOff className="size-4 animate-pulse" /> Stop Recording Attempt</>
          ) : (
            <><Mic className="size-4" /> Record Attempt</>
          )}
        </Button>

        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1.5 border ${
          isRecording
            ? 'bg-red-500/10 text-red-400 border-red-500/30'
            : isMicOn
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-muted text-muted-foreground border-border'
        }`}>
          <span className={`size-2 rounded-full ${
            isRecording ? 'bg-red-500 animate-ping' : isMicOn ? 'bg-emerald-500' : 'bg-muted-foreground'
          }`} />
          {isRecording ? 'RECORDING SESSION' : isMicOn ? 'MIC ACTIVE (PRACTICE)' : 'MIC OFF'}
        </span>
      </div>

      <div className="flex items-center gap-2">
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
