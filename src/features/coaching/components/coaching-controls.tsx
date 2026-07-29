'use client';

import { Mic, MicOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoachingControlsProps {
  isRecording: boolean;
  onToggleRecording: () => void;
  onFinish: () => void;
}

export function CoachingControls({
  isRecording,
  onToggleRecording,
  onFinish,
}: CoachingControlsProps) {
  return (
    <div className="h-14 border-t border-border bg-card px-6 flex items-center justify-between shrink-0">
      <Button
        onClick={onToggleRecording}
        variant={isRecording ? 'destructive' : 'default'}
        size="sm"
        className="font-medium text-xs flex items-center gap-2"
      >
        {isRecording ? <><MicOff className="size-4" /> Pause Recording</> : <><Mic className="size-4" /> Start Rehearsal</>}
      </Button>

      <Button
        onClick={onFinish}
        variant="secondary"
        size="sm"
        className="font-medium text-xs flex items-center gap-2"
      >
        Finish Rehearsal <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
