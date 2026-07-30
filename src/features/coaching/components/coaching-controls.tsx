'use client';

import { Mic, MicOff, ArrowRight, Video } from 'lucide-react';
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
    <div className="h-14 border-t border-border bg-card/80 backdrop-blur px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        {/* Practice Mic Button */}
        <Button
          onClick={onToggleMic}
          variant={isMicOn ? 'secondary' : 'outline'}
          size="sm"
          className="font-medium text-xs flex items-center gap-2 h-8"
        >
          {isMicOn ? <MicOff className="size-3.5 text-primary" /> : <Mic className="size-3.5" />}
          {isMicOn ? 'Mute Mic' : 'Unmute Mic (Practice)'}
        </Button>

        {/* Record Attempt Toggle */}
        <Button
          onClick={onToggleRecording}
          variant={isRecording ? 'destructive' : 'default'}
          size="sm"
          className="font-medium text-xs flex items-center gap-2 h-8"
        >
          {isRecording ? <Video className="size-3.5 animate-pulse" /> : <Video className="size-3.5" />}
          {isRecording ? 'Stop Recording' : 'Record Official Session'}
        </Button>

        {/* Single Clean Badge */}
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1.5 border transition-all ${
          isRecording
            ? 'bg-red-500/10 text-red-400 border-red-500/30'
            : isMicOn
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-muted/40 text-muted-foreground border-border'
        }`}>
          <span className={`size-1.5 rounded-full ${
            isRecording ? 'bg-red-500 animate-ping' : isMicOn ? 'bg-emerald-500' : 'bg-muted-foreground/60'
          }`} />
          {isRecording ? 'RECORDING SESSION' : isMicOn ? 'PRACTICE MIC ACTIVE' : 'MIC OFF'}
        </span>
      </div>

      <Button
        onClick={onFinish}
        variant="secondary"
        size="sm"
        className="font-medium text-xs flex items-center gap-1.5 h-8"
      >
        Finish Session <ArrowRight className="size-3.5" />
      </Button>
    </div>
  );
}
