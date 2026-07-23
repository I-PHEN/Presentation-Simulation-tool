import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { buildDefenseEvaluationPrompt } from '@/features/defense/evaluation';
import { analyseReading } from '@/features/defense/reading-analysis';
import { spokenBySlide } from '@/features/defense/transcript';
import { getZAI } from '@/lib/zai';
import { defenseFindingSchema } from '@/features/defense/types';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';
import { assembleCoachingReport, validatePersonaVerdictLines } from '@/features/defense/coaching-report';

const requestSchema = z.object({ sessionId: z.string().trim().min(1).max(200) }).strict();
const deckSchema = z.object({ sourceName: z.string(), slides: z.array(z.object({ index: z.number().int().positive(), text: z.string(), imageUrl: z.string() })).min(1) });
const transcriptSchema = z.array(z.object({ role: z.enum(['presenter', 'examiner']), slideIndex: z.number().int().positive(), text: z.string(), startedAtMs: z.number().finite().nonnegative(), endedAtMs: z.number().finite().nonnegative() }));
const eventSchema = z.array(z.object({ kind: z.enum(['interrupt', 'question', 'follow_up']), text: z.string(), slideIndex: z.number().int().positive(), evidence: z.string(), occurredAtMs: z.number().finite().nonnegative(), persona: z.object({ id: z.string(), title: z.string() }).optional() }));
const findingsSchema = z.object({
  findings: z.array(defenseFindingSchema).min(1).max(3),
  personaVerdicts: z.array(z.object({ personaId: z.string(), line: z.string() })).optional(),
}).strict();

function parse<T>(value: string, schema: z.ZodType<T>): T | null { try { const parsed = schema.safeParse(JSON.parse(value)); return parsed.success ? parsed.data : null; } catch { return null; } }
function cleanModelJson(value: string): string { return value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); }
function normalise(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

export async function POST(request: Request) {
  const identity = await authenticateRequest(request);
  if (isAuthenticationFailure(identity)) return identity;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid report request' }, { status: 400 }); }
  const requested = requestSchema.safeParse(body);
  if (!requested.success) return NextResponse.json({ error: 'Invalid report request' }, { status: 400 });
  try {
    const session = await db.session.findFirst({ where: { id: requested.data.sessionId, userId: identity.userId } });
    if (!session || session.practiceMode !== 'defense') return NextResponse.json({ error: 'Defense session not found' }, { status: 404 });
    const deck = parse(session.deckContext, deckSchema);
    const transcriptSegments = parse(session.transcriptSegments, transcriptSchema);
    const examinerEvents = parse(session.examinerEvents, eventSchema);
    if (!deck || !transcriptSegments || !examinerEvents) return NextResponse.json({ error: 'Defense session evidence is unavailable' }, { status: 422 });
    const spoken = spokenBySlide(transcriptSegments);
    const noSpeech = Object.keys(spoken).length === 0;

    const readingEvidence = analyseReading(deck.slides, spoken);
    const cache = async (report: Awaited<ReturnType<typeof assembleCoachingReport>>, findings: unknown) => {
      await db.session.update({ where: { id: session.id }, data: { findings: JSON.stringify(findings), summary: JSON.stringify({ coachingReport: report }) } });
    };

    // Graceful minimal report: no presenter speech → still return a usable, grounded report.
    if (noSpeech) {
      const report = assembleCoachingReport({ deck, transcriptSegments, examinerEvents, findings: [], verdictLines: {}, minimal: true });
      await cache(report, []);
      return NextResponse.json({ report });
    }

    const zai = await getZAI();
    const completion = await zai.chat.completions.create({ messages: [{ role: 'system', content: buildDefenseEvaluationPrompt({ title: session.title, mode: session.mode === 'mock' ? 'mock' : 'diagnostic', deckText: deck.slides.map((slide) => `Slide ${slide.index}: ${slide.text}`).join('\n'), transcript: transcriptSegments.filter((segment) => segment.role === 'presenter').map((segment) => `Slide ${segment.slideIndex}: ${segment.text}`).join('\n'), readingEvidence, examinerEvents }) }], thinking: { type: 'disabled' } });
    const text = completion.choices[0]?.message?.content;
    let candidate: unknown;
    try { candidate = text ? JSON.parse(cleanModelJson(text)) : null; } catch { candidate = null; }
    const parsed = findingsSchema.safeParse(candidate);

    const findingsUnsupported = !parsed.success || parsed.data.findings.some((finding) => {
      const speech = normalise(spoken[finding.slideIndex] || '');
      const quote = normalise(finding.presenterQuote);
      const reading = readingEvidence.find((item) => item.slideIndex === finding.slideIndex);
      return !deck.slides.some((slide) => slide.index === finding.slideIndex)
        || !quote || !speech.includes(quote)
        || (finding.basis === 'slide_reliance' && (!reading?.hasSpeech || (reading.overlap <= 0 && reading.copiedPhrases.length === 0)));
    });

    // Unvalidatable findings → minimal report (grounded timeline/metrics/persona evidence still render), not a 502.
    if (findingsUnsupported || !parsed.success) {
      const report = assembleCoachingReport({ deck, transcriptSegments, examinerEvents, findings: [], verdictLines: {}, minimal: true });
      await cache(report, []);
      return NextResponse.json({ report });
    }

    const verdictLines = validatePersonaVerdictLines(examinerEvents, parsed.data.personaVerdicts);
    const report = assembleCoachingReport({ deck, transcriptSegments, examinerEvents, findings: parsed.data.findings, verdictLines, minimal: false });
    await cache(report, parsed.data.findings);
    return NextResponse.json({ report });
  } catch (error) {
    console.error('Defense report generation failed', error);
    return NextResponse.json({ error: 'Unable to create the defense report. Please retry.' }, { status: 500 });
  }
}
