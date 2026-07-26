'use client';

import type { ReactNode } from 'react';

/** Angle prompts are generic scaffolding, not fabricated content — they nudge
 * structure without putting words in the speaker's mouth. */
const ANGLE_PROMPTS: readonly string[] = [
  'State your claim in one sentence.',
  'Name the strongest evidence for it.',
  'Address the sharpest counter-argument.',
];

export function TopicStage({ topic, caption }: { topic: string; caption?: ReactNode }) {
  return (
    <section aria-label="Your speaking topic" className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex h-full flex-col justify-center gap-6 overflow-y-auto p-8 sm:p-12">
          <p className="text-xs font-medium text-muted-foreground">Your topic</p>
          <h1 className="font-display text-2xl font-medium leading-tight tracking-tight sm:text-4xl">{topic}</h1>
          <ul className="mt-2 flex flex-col gap-2">
            {ANGLE_PROMPTS.map((prompt) => (
              <li key={prompt} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                {prompt}
              </li>
            ))}
          </ul>
        </div>
        {caption}
      </div>
      <p className="shrink-0 px-1 text-sm text-muted-foreground">Speak to your topic, then defend it under the panel&#x27;s questions.</p>
    </section>
  );
}
