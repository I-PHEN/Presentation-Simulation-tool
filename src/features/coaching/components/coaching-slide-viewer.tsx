'use client';

import { ChevronLeft, ChevronRight, Sparkles, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Slide {
  id?: string | number;
  imageUrl?: string;
  text?: string;
}

interface CoachingSlideViewerProps {
  slides: Slide[];
  currentSlide: number;
  onPrevious: () => void;
  onNext: () => void;
  topicTitle?: string;
}

export function CoachingSlideViewer({
  slides,
  currentSlide,
  onPrevious,
  onNext,
  topicTitle,
}: CoachingSlideViewerProps) {
  const totalSlides = slides.length || 1;
  const currentSlideObj = slides[currentSlide];

  const isTopicSession = !currentSlideObj?.imageUrl || currentSlideObj?.imageUrl === 'topic' || currentSlideObj?.imageUrl?.startsWith('topic');

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative bg-muted/20">
      {slides.length > 0 ? (
        <div className="w-full max-w-3xl flex flex-col items-center">
          {isTopicSession ? (
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 sm:p-10 shadow-md text-center space-y-4 animate-in fade-in duration-200">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> Spoken Topic Presentation
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-foreground leading-snug">
                {currentSlideObj?.text || topicTitle || 'Spoken Topic Presentation'}
              </h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Speak to your topic argument. Your AI Coach evaluates your pacing, depth, and presenter directives in real-time.
              </p>
            </div>
          ) : (
            <img
              key={currentSlide}
              src={currentSlideObj?.imageUrl}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-auto max-h-[52vh] object-contain rounded-xl border border-border shadow-md bg-card"
            />
          )}

          {totalSlides > 1 && (
            <div className="mt-4 flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentSlide === 0}
                onClick={onPrevious}
              >
                <ChevronLeft className="size-4 mr-1" /> Previous
              </Button>
              <span className="text-xs font-mono text-muted-foreground">
                Slide <strong className="text-foreground">{currentSlide + 1}</strong> of {totalSlides}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentSlide >= totalSlides - 1}
                onClick={onNext}
              >
                Next <ChevronRight className="size-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 text-center text-muted-foreground text-sm">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="font-medium text-foreground">Preparing coaching room...</p>
        </div>
      )}
    </div>
  );
}
