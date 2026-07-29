'use client';

import { useState } from 'react';
import { Sparkles, Volume2, Copy, Check, X, Loader2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { SlideScriptData } from '../types';

interface CoachRescueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script?: SlideScriptData;
  coachPersona: string;
  onPlayAudio: () => void;
  isPlayingAudio: boolean;
}

export function CoachRescueModal({
  open,
  onOpenChange,
  script,
  coachPersona,
  onPlayAudio,
  isPlayingAudio,
}: CoachRescueModalProps) {
  const [copied, setCopied] = useState(false);

  const coachName = coachPersona === 'sarah' ? 'Coach Sarah' : 'Coach Marcus';
  const coachTitle = coachPersona === 'sarah' ? 'Presentation Strategist' : 'Executive Delivery Specialist';

  const fullScript = script ? `${script.openingHook}\n\n${script.talkingPoints.map((tp) => `• ${tp}`).join('\n')}\n\n${script.rescueScript}` : '';

  const handleCopy = async () => {
    if (!fullScript) return;
    await navigator.clipboard.writeText(fullScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl p-6 border border-border bg-card shadow-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-wider">
            <Sparkles className="size-4" /> Coach Rescue Active
          </div>
          <DialogTitle className="font-display text-xl font-medium tracking-tight text-foreground flex items-center justify-between">
            <span>Model Pitch Script</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Here is an executive-level model pitch script crafted by <strong className="text-foreground">{coachName}</strong> ({coachTitle}) for your current slide/topic.
          </DialogDescription>
        </DialogHeader>

        {script ? (
          <div className="mt-4 space-y-4">
            {/* Opening Hook Callout */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-1">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block">Opening Hook</span>
              <p className="text-xs font-medium text-foreground leading-relaxed italic">
                &ldquo;{script.openingHook}&rdquo;
              </p>
            </div>

            {/* Model Script Text */}
            <div className="rounded-xl border border-border bg-background p-4 space-y-2 max-h-[30vh] overflow-y-auto font-sans">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Full Executive Delivery Script</span>
              <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                {script.rescueScript}
              </p>
            </div>

            {/* Talking Points List */}
            {script.talkingPoints.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Key Talking Points</span>
                <ul className="grid gap-1.5 text-xs text-muted-foreground">
                  {script.talkingPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 bg-surface p-2 rounded-lg border border-border">
                      <span className="font-mono text-primary font-semibold text-[10px] mt-0.5">{i + 1}.</span>
                      <span className="text-foreground font-medium">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action CTAs */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={onPlayAudio}
                disabled={isPlayingAudio}
                className="flex-1 h-10 text-xs font-semibold flex items-center justify-center gap-2 rounded-xl"
              >
                {isPlayingAudio ? (
                  <><Loader2 className="size-4 animate-spin" /> Playing Coach Voiceover...</>
                ) : (
                  <><Volume2 className="size-4" /> Listen to Coach Voiceover</>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={handleCopy}
                className="h-10 text-xs font-medium flex items-center gap-1.5 rounded-xl shrink-0"
              >
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                {copied ? 'Copied!' : 'Copy Script'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground text-xs">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p>Generating executive pitch script...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
