'use client';

import { Swords } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import UploadSection from '@/components/upload-section';
import ConfigureSection from '@/components/configure-section';
import PresentSection from '@/components/present-section';
import QNASection from '@/components/qna-section';
import ScoringDashboard from '@/components/scoring-dashboard';
import { ThemeToggle } from '@/components/theme-toggle';
import { initVoiceEngine } from '@/lib/voice-engine';
import { useEffect } from 'react';

const stepLabels: Record<number, string> = {
  1: 'Setup',
  2: 'Configure',
  3: 'Present',
  4: 'Q&A',
  5: 'Results',
};

export default function Home() {
  const step = useAppStore((s) => s.step);

  useEffect(() => {
    // Eagerly preload models in the background when app opens
    initVoiceEngine();
  }, []);

  const renderStep = () => {
    switch (step) {
      case 1: return <UploadSection />;
      case 2: return <ConfigureSection />;
      case 3: return <PresentSection />;
      case 4: return <QNASection />;
      case 5: return <ScoringDashboard />;
      default: return <UploadSection />;
    }
  };

  const isPresenting = step === 3;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header — hidden during presentation for immersive view */}
      {!isPresenting && (
        <header className="shrink-0 border-b border-border bg-surface/90 backdrop-blur-xl z-50">
          <div className="max-w-6xl mx-auto w-full flex items-center justify-between px-5 h-10">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="rounded bg-primary/10 p-1">
                <Swords className="size-3 text-primary" />
              </div>
              <span className="font-semibold text-[12px] text-foreground tracking-tight">
                Sparring Partner
              </span>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {([1, 2, 3, 4, 5] as const).map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className={`rounded-full transition-all duration-300 ${
                        s === step
                          ? 'h-1 w-5 bg-primary'
                          : s < step
                          ? 'h-1 w-2.5 bg-primary/30'
                          : 'h-1 w-2.5 bg-border'
                      }`}
                    />
                    {i < 4 && (
                      <div className={`w-2 h-px ${s < step ? 'bg-primary/20' : 'bg-border'}`} />
                    )}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                {stepLabels[step]}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      {/* Main */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
