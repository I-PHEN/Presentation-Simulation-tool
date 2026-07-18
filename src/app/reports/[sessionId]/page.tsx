'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/features/defense/components/app-shell';
import { DefenseReportView } from '@/features/defense/components/defense-report';
import { defenseReportSchema, type DefenseReport } from '@/features/defense/types';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export function reportFromSummary(value: unknown): DefenseReport | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = (value as Record<string, unknown>).defenseReport;
  const parsed = defenseReportSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export default function DefenseReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const [sessionId, setSessionId] = useState<string>();
  const [report, setReport] = useState<DefenseReport>();
  const [error, setError] = useState<string>();
  useEffect(() => { void params.then(({ sessionId: value }) => setSessionId(value)); }, [params]);
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const load = async () => {
      try {
        const stored = await authenticatedFetch(`/api/session/${sessionId}`).then(async (response) => ({ ok: response.ok, body: await response.json() }));
        const summaryText = stored.body?.defense?.summary;
        let parsed: unknown = null;
        try { parsed = typeof summaryText === 'string' ? JSON.parse(summaryText) : null; } catch { parsed = null; }
        const cached = stored.ok ? reportFromSummary(parsed) : null;
        if (cached) { if (active) setReport(cached); return; }
        const generated = await authenticatedFetch('/api/defense/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId }) });
        const body = await generated.json();
        if (!generated.ok || !reportFromSummary({ defenseReport: body.report })) throw new Error(body.error || 'Unable to create this defense report.');
        if (active) setReport(body.report);
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load this defense report.'); }
    };
    void load(); return () => { active = false; };
  }, [sessionId]);
  return <AppShell active="reports">{error ? <p role="alert" className="border-l-2 border-destructive pl-3 text-sm">{error}</p> : report ? <DefenseReportView report={report} retryHref={`/practice/${sessionId}`} /> : <p role="status" className="text-sm text-muted-foreground">Preparing your evidence-led report...</p>}</AppShell>;
}
