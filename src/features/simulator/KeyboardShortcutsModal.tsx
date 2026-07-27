'use client';

import { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '← / →', action: 'Previous / Next slide' },
    { key: 'M', action: 'Toggle microphone on / off' },
    { key: 'V', action: 'Toggle camera PIP view' },
    { key: 'F', action: 'Toggle fullscreen stage' },
    { key: '?', action: 'Show / hide shortcuts HUD' },
    { key: 'Esc', action: 'Exit fullscreen mode' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-e3 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Keyboard className="size-4 text-primary" /> Keyboard Controls
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="divide-y divide-border text-xs">
          {shortcuts.map(({ key, action }) => (
            <div key={key} className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">{action}</span>
              <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground shadow-sm">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-secondary py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
