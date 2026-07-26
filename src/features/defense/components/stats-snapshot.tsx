import Link from 'next/link';
import type { SpeakerProfileData } from '@/features/coaching/speaker-profile';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** A small honest snapshot of how much the speaker has rehearsed, linking to the full trend. */
export function StatsSnapshot({ profile }: { profile: SpeakerProfileData }) {
  const { totalSessions, streak } = profile;
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-6" aria-labelledby="stats-heading">
      <p id="stats-heading" className="text-xs font-medium text-muted-foreground">Your rehearsals</p>
      <p className="mt-2 font-display text-3xl font-medium tracking-tight">{totalSessions}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {totalSessions === 1 ? 'session logged' : 'sessions logged'}{streak > 1 ? ` · ${streak}-day streak` : ''}
      </p>
      <Link href="/review" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-auto w-fit pt-4')}>
        View trend
      </Link>
    </section>
  );
}
