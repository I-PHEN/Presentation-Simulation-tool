'use client';

import { ChevronLeft, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CoachingHeaderProps {
  title?: string;
  onBack: () => void;
}

export function CoachingHeader({ title = 'Coaching Session', onBack }: CoachingHeaderProps) {
  return (
    <div className="h-14 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4 mr-1" /> Dashboard
        </Button>
        <span className="h-4 w-px bg-border" />
        <h1 className="text-sm font-medium text-foreground truncate max-w-sm">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <span data-testid="coaching-studio-badge" className="text-xs font-semibold text-primary flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 border border-primary/20">
          <GraduationCap className="size-4 text-primary" /> 🎓 1-on-1 Executive Coaching Studio
        </span>
      </div>
    </div>
  );
}
