import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { defenseFindingSchema, coachingReportSchema } from '@/features/defense/types';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';
import { dimensionsFromMetrics } from '@/features/coaching/session-outcome';

const deckSchema = z.object({
  sourceName: z.string().trim().min(1),
  slides: z.array(z.object({ index: z.number().int().positive(), text: z.string(), imageUrl: z.string().min(1) })).min(1),
}).strict();

const summarySchema = z.object({ coachingReport: coachingReportSchema }).strict();

function parsePersisted<T>(value: string, schema: z.ZodType<T>): T | undefined {
  try {
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export async function GET(req: NextRequest) {
  try {
    const identity = await authenticateRequest(req);
    if (isAuthenticationFailure(identity)) return identity;
    const sessions = await db.session.findMany({
      where: { practiceMode: 'defense', userId: identity.userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      sessions: sessions.map((session) => {
        const deck = parsePersisted(session.deckContext, deckSchema);
        const report = parsePersisted(session.summary, summarySchema)?.coachingReport;
        const dimensions = report ? dimensionsFromMetrics(report.metrics) : undefined;
        const finding = report?.highestLeverage ?? parsePersisted(session.findings, z.array(defenseFindingSchema).min(1))?.[0];
        return {
          id: session.id,
          title: session.title,
          createdAt: session.createdAt,
          status: session.status,
          source: session.source === 'topic' ? 'topic' : 'deck',
          mode: session.mode === 'mock' ? 'mock' : 'diagnostic',
          stance: session.stance === 'supportive' ? 'supportive' : 'rigorous',
          ...(deck ? { deck } : {}),
          ...(finding ? { finding: { title: finding.title, evidence: finding.evidence, drill: finding.drill } } : {}),
          ...(report ? { report: { nextDrill: report.drills[0] ?? '', highestLeverage: { title: report.highestLeverage.title, slideIndex: report.highestLeverage.slideIndex } } } : {}),
          ...(dimensions && Object.keys(dimensions).length > 0 ? { dimensions } : {}),
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching defense sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch defense sessions' }, { status: 500 });
  }
}
