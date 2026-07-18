import Link from 'next/link';
import type { DefenseReport } from '@/features/defense/types';

export function DefenseReportView({ report, retryHref = '/practice' }: { report: DefenseReport; retryHref?: string }) {
  return <section className="space-y-8 text-sm leading-6">
    <header className="border-b border-border pb-6"><p className="text-muted-foreground">Highest-leverage issue</p><h1 className="mt-1 text-2xl font-semibold">{report.highestLeverage.title}</h1><p className="mt-2">{report.highestLeverage.evidence}</p></header>
    <section><h2 className="text-lg font-semibold">Evidence trail</h2>{report.evidenceTrail.map((item) => <article key={`${item.slideIndex}-${item.responseGap}`} className="mt-4 border-l-2 border-border pl-4"><p><strong>Slide {item.slideIndex}</strong> — {item.slideClaim}</p><p className="mt-2"><strong>What you said:</strong> {item.presenterSpeech}</p>{item.examinerEvent && <p className="mt-2"><strong>Examiner pressure:</strong> {item.examinerEvent}</p>}<p className="mt-2"><strong>Response gap:</strong> {item.responseGap}</p><p className="mt-2"><strong>Retry drill:</strong> {item.drill}</p></article>)}</section>
    <section><h2 className="text-lg font-semibold">Slide reliance</h2><p>{report.slideReliance.summary}</p></section>
    {report.strengths.length > 0 && <section><h2 className="text-lg font-semibold">Strengths</h2><ul>{report.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul></section>}
    <Link href={retryHref} className="inline-flex rounded-md border border-border px-4 py-2 font-medium hover:bg-surface">Retry this drill</Link>
  </section>;
}
