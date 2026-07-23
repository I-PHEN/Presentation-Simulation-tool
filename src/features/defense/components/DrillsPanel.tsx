import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DrillsPanel({ drills, retryHref }: { drills: string[]; retryHref: string }) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-lg font-semibold text-foreground">Your next drills</h2>
      <ol className="mt-4 flex flex-col gap-2 list-decimal pl-5 marker:text-muted-foreground">
        {drills.map((drill, index) => <li key={`${index}-${drill}`} className="text-sm text-foreground">{drill}</li>)}
      </ol>
      <Link href={retryHref} className={cn(buttonVariants({ size: 'lg' }), 'mt-5 w-fit')}>Rehearse again</Link>
    </section>
  );
}
