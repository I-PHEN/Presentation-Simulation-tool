import Link from 'next/link';
import type { DefenseReport } from '@/features/defense/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DefenseReportView({ report, retryHref = '/practice' }: { report: DefenseReport; retryHref?: string }) {
  return <section className="space-y-8 text-sm leading-6">
    <header className="rounded-xl border border-border bg-card p-6 shadow-e1"><p className="text-muted-foreground">Highest-leverage issue</p><h1 className="mt-1 font-display text-2xl font-medium tracking-tight">{report.highestLeverage.title}</h1><p className="mt-2">{report.highestLeverage.evidence}</p></header>
    <section><h2 className="text-lg font-semibold">Evidence trail</h2><div className="mt-4 flex flex-col gap-4">{report.evidenceTrail.map((item) => <article key={`${item.slideIndex}-${item.responseGap}`} className="rounded-lg border border-border bg-surface/60 p-4"><p><strong>Slide {item.slideIndex}</strong> — {item.slideClaim}</p><p className="mt-2"><strong>What you said:</strong> {item.presenterSpeech}</p>{item.examinerEvent && <p className="mt-2"><strong>Examiner pressure:</strong> {item.examinerEvent}</p>}<p className="mt-2"><strong>Response gap:</strong> {item.responseGap}</p><p className="mt-2"><strong>Retry drill:</strong> {item.drill}</p></article>)}</div></section>
    <section><h2 className="text-lg font-semibold">Slide reliance</h2><p>{report.slideReliance.summary}</p></section>
    {report.strengths.length > 0 && <section><h2 className="text-lg font-semibold">Strengths</h2><ul>{report.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul></section>}
    <Link href={retryHref} className={cn(buttonVariants({ size: 'lg' }), 'w-fit')}>Retry this drill</Link>
  </section>;
}
