import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Home's deckless entry point. With interests, it surfaces one recommended
 * speakable topic; without them, it invites the user to pick interests. It never
 * fabricates a topic - the page only passes one through when interests exist.
 */
export function TodaysTopicCard({ topic, hasInterests }: { topic?: string; hasInterests: boolean }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1" aria-labelledby="todays-topic-heading">
      <p id="todays-topic-heading" className="text-xs font-medium text-muted-foreground">Today&#x27;s topic</p>
      {topic ? (
        <>
          <p className="mt-3 font-display text-xl font-medium tracking-tight">{topic}</p>
          <Link href="/decks/new" className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-4 w-fit')}>
            Rehearse this
          </Link>
        </>
      ) : hasInterests ? (
        <p className="mt-3 text-sm text-muted-foreground">Finding a topic tailored to your interests...</p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tell us what you want to speak about and we&#x27;ll suggest topics you can rehearse without slides.
          </p>
          <Link href="/welcome" className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-4 w-fit')}>
            Pick your interests
          </Link>
        </>
      )}
    </section>
  );
}
