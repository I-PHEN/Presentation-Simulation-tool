import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getZAI } from '@/lib/zai';
import { createExaminerEventSchema } from '@/features/defense/examiner';
import { authenticateRequest, isAuthenticationFailure } from '@/lib/server-auth';

const examinerDecisionSchema = z.object({ kind: z.enum(['interrupt', 'question', 'follow_up']) }).passthrough();

const requestSchema = z.object({
  sessionId: z.string().trim().min(1).max(200),
  currentSegment: z.object({
    role: z.literal('presenter'),
    slideIndex: z.number().int().positive(),
    text: z.string().trim().min(1).max(5_000),
    startedAtMs: z.number().finite().nonnegative(),
    endedAtMs: z.number().finite().nonnegative(),
  }).refine((segment) => segment.endedAtMs >= segment.startedAtMs),
  readingEvidence: z.object({
    slideIndex: z.number().int().positive(), hasSpeech: z.boolean(), overlap: z.number().min(0).max(1),
    copiedPhrases: z.array(z.string().max(500)).max(50), explanationSignals: z.array(z.string().max(500)).max(50),
  }).optional(),
  persona: z.object({ id: z.string().trim().min(1).max(50), title: z.string().trim().min(1).max(80), promptFragment: z.string().trim().min(1).max(2_000) }).optional(),
  /** Milliseconds since the rehearsal began. Every other time in a session is on
   * this clock, so the event has to be stamped on it too - a server Date.now()
   * would make the report's timestamps, seeks, and "responded" checks nonsense. */
  elapsedMs: z.number().finite().nonnegative().optional(),
}).strict().refine((request) => !request.readingEvidence || request.readingEvidence.slideIndex === request.currentSegment.slideIndex);

function parseDeck(value: string): { slides: Array<{ index: number; text: string }> } | null {
  try {
    const deck: unknown = JSON.parse(value);
    const parsed = z.object({ slides: z.array(z.object({ index: z.number().int().positive(), text: z.string() })).min(1) }).safeParse(deck);
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}

function excerpt(text: string): string { return text.trim().slice(0, 350); }

const PERSONA_LEADS: Record<string, string> = {
  professor: 'Walk me through your method here.',
  examiner: 'Address this precisely.',
  peer: 'Say this in plain terms.',
};

function createServerGroundedEvent(
  kind: 'interrupt' | 'question' | 'follow_up',
  stance: 'supportive' | 'rigorous',
  slideIndex: number,
  slideText: string,
  speech: string,
  occurredAtMs: number,
  /** A topic session has no deck; its topic is modelled as one synthetic slide,
   * so the panel must cite what the speaker is arguing, never "the slide". */
  deckless: boolean,
  persona?: { id: string; title: string },
) {
  const claim = excerpt(slideText);
  const spoken = excerpt(speech);
  const lead = persona
    ? (PERSONA_LEADS[persona.id] ?? (stance === 'rigorous' ? 'Address this precisely.' : 'Please clarify this connection.'))
    : stance === 'rigorous' ? 'Address this precisely.' : 'Please clarify this connection.';
  const action = kind === 'interrupt' ? 'Pause for a moment' : kind === 'follow_up' ? 'Follow up on this point' : 'Please explain';
  // "speaking to" carries topics phrased as a claim and as a question alike.
  const source = deckless ? `you are speaking to "${claim}"` : `the slide states "${claim}"`;
  return {
    kind,
    text: `${action}: ${source} and you said "${spoken}". ${lead}`,
    slideIndex,
    evidence: `${deckless ? 'Topic' : 'Slide claim'}: ${claim} Presenter speech: ${spoken}`,
    occurredAtMs,
    ...(persona ? { persona: { id: persona.id, title: persona.title } } : {}),
  };
}

export async function POST(request: Request) {
  const identity = await authenticateRequest(request);
  if (isAuthenticationFailure(identity)) return identity;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid examiner request' }, { status: 400 }); }
  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) return NextResponse.json({ error: 'Invalid examiner request' }, { status: 400 });

  try {
    const { sessionId, currentSegment, readingEvidence, persona, elapsedMs } = parsedRequest.data;
    const session = await db.session.findFirst({ where: { id: sessionId, userId: identity.userId } });
    if (!session || session.practiceMode !== 'defense') return NextResponse.json({ error: 'Defense session not found' }, { status: 404 });
    const deck = parseDeck(session.deckContext);
    const slide = deck?.slides.find((item) => item.index === currentSegment.slideIndex);
    if (!slide) return NextResponse.json({ error: 'Current slide is unavailable' }, { status: 400 });
    const stance = session.stance === 'supportive' ? 'supportive' : 'rigorous';
    const deckless = session.source === 'topic';
    // Verbatim-reading evidence is about reading slides aloud. A topic session has
    // a one-line topic, so the same signal is meaningless there - and the report
    // already drops its verbatim metrics when deckless.
    const reading = deckless ? undefined : readingEvidence;
    const prompt = `You are a ${stance} ${deckless ? 'examiner questioning a spoken argument' : 'thesis examiner'}.${persona ? ` Persona focus: ${persona.promptFragment}` : ''} Return ONLY either NO_INTERRUPT or a JSON object matching exactly this schema: {"kind":"interrupt"|"question"|"follow_up"}.

${deckless ? 'Topic being argued' : 'Current slide claim/text'}: ${slide.text}
Presenter's current spoken evidence: ${currentSegment.text}
${reading ? `Reading evidence: ${JSON.stringify(reading)}` : ''}

Only decide whether an event is warranted and its kind. Do not write a question, evidence, slide index, or factual claim. If no grounded issue exists, return NO_INTERRUPT.`;
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({ messages: [{ role: 'system', content: prompt }], thinking: { type: 'disabled' } });
    const content = completion.choices[0]?.message?.content?.trim();
    if (content === 'NO_INTERRUPT' || !content) return NextResponse.json({ event: null });
    let candidate: unknown;
    try { candidate = JSON.parse(content); } catch { return NextResponse.json({ event: null }); }
    const decision = examinerDecisionSchema.safeParse(candidate);
    if (!decision.success) return NextResponse.json({ event: null });
    // Without an explicit elapsedMs, the end of the segment being answered is the
    // truest moment on the session clock - and it beats a server Date.now(), which
    // is a different clock entirely.
    const occurredAtMs = elapsedMs ?? currentSegment.endedAtMs;
    const event = createExaminerEventSchema.safeParse(createServerGroundedEvent(decision.data.kind, stance, slide.index, slide.text, currentSegment.text, occurredAtMs, deckless, persona ? { id: persona.id, title: persona.title } : undefined));
    return NextResponse.json({ event: event.success ? event.data : null });
  } catch (error) {
    console.error('Examiner generation failed', error);
    return NextResponse.json({ error: 'Examiner generation failed' }, { status: 500 });
  }
}
