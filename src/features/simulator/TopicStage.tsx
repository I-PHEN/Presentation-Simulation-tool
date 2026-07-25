'use client';

/** Angle prompts are generic scaffolding, not fabricated content — they nudge
 * structure without putting words in the speaker's mouth. */
const ANGLE_PROMPTS: readonly string[] = [
  'State your claim in one sentence.',
  'Name the strongest evidence for it.',
  'Address the sharpest counter-argument.',
];

export function TopicStage({ topic }: { topic: string }) {
  return (
    <section aria-label="Your speaking topic" className="flex min-w-0 flex-col gap-3">
      <div className="relative flex aspect-video flex-col justify-center gap-6 overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-e2 before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-primary before:to-transparent after:absolute after:inset-0 after:-z-10 after:rounded-2xl after:bg-primary/10 after:blur-2xl sm:p-12">
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
      <p className="px-1 text-sm text-muted-foreground">Speak to your topic, then defend it under the panel&#x27;s questions.</p>
    </section>
  );
}
