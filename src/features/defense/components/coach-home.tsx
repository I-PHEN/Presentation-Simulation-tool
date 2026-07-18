import Link from 'next/link';
import type { CoachHomeModel } from '@/features/defense/coach-home-model';

export function CoachHome({ name, model }: { name: string; model: CoachHomeModel }) {
  return (
    <div className="border-y border-border">
      <section className="py-10 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Today
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Good to see you, {name}.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          A short, focused voice practice will make your explanation stronger today.
        </p>
      </section>

      <section
        className="border-t border-border py-7 sm:py-9"
        aria-labelledby="next-practice-heading"
      >
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Your next best practice - {model.nextPractice.duration}
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 id="next-practice-heading" className="text-2xl font-semibold tracking-tight">
              {model.nextPractice.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {model.nextPractice.summary}
            </p>
          </div>
          <Link
            href={model.nextPractice.href}
            className="inline-flex w-fit items-center justify-center bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            {model.nextPractice.actionLabel}
          </Link>
        </div>
      </section>

      <section
        id="trajectory"
        className="grid border-t border-border md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
        aria-labelledby="trajectory-heading"
      >
        <div className="py-7 md:border-r md:border-border md:pr-8">
          <p
            id="trajectory-heading"
            className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
          >
            {model.trajectory.label}
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6">{model.trajectory.detail}</p>
        </div>
        <div className="border-t border-border py-7 md:border-t-0 md:pl-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Next milestone
          </p>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            {model.trajectory.milestone}
          </p>
        </div>
      </section>

      {model.programme && (
        <section
          id="programme"
          className="flex flex-col gap-3 border-t border-border py-7 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Current programme
            </p>
            <p className="mt-2 text-sm font-medium">{model.programme.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {model.programme.sourceName} - {model.programme.slideCount} slides
            </p>
          </div>
          <Link href={model.programme.href} className="text-sm font-medium underline underline-offset-4">
            View defense plan
          </Link>
        </section>
      )}

      <section
        data-testid="daily-challenge-preview"
        className="border-t border-border py-7"
        aria-labelledby="daily-challenge-heading"
      >
        <p
          id="daily-challenge-heading"
          className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"
        >
          Daily speaking challenge - coming next
        </p>
        <p className="mt-3 text-base font-medium tracking-tight">{model.dailyChallenge.title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {model.dailyChallenge.target} - {model.dailyChallenge.duration} voice drill
        </p>
      </section>
    </div>
  );
}
