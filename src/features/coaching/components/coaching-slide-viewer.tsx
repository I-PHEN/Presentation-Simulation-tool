'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Slide {
  id: string | number;
  imageUrl?: string;
  text?: string;
}

interface CoachingSlideViewerProps {
  slides: Slide[];
  currentSlide: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function CoachingSlideViewer({
  slides,
  currentSlide,
  onPrevious,
  onNext,
}: CoachingSlideViewerProps) {
  const totalSlides = slides.length || 1;
  const currentSlideObj = slides[currentSlide];

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative bg-muted/20">
      {slides.length > 0 ? (
        <div className="w-full max-w-3xl flex flex-col items-center">
          <img
            key={currentSlide}
            src={currentSlideObj?.imageUrl}
            alt={`Slide ${currentSlide + 1}`}
            className="w-full h-auto max-h-[52vh] object-contain rounded-xl border border-border shadow-md bg-card"
          />
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
        </div>
      ) : (
        <div className="text-center text-muted-foreground text-sm italic">
          Loading slides...
        </div>
      )}
    </div>
  );
}
