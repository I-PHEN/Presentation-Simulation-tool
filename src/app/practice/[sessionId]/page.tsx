'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/features/defense/components/app-shell';
import { PracticeSetup } from '@/features/defense/components/practice-setup';
import { RehearsalRoom } from '@/features/defense/components/rehearsal-room';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';
import { defenseDeckSchema, examinerEventsSchema, transcriptSegmentsSchema } from '@/features/defense/session-schema';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

type DefenseSession = { id: string; deck: DeckContext; mode: DefenseMode; stance: ExaminerStance; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; status: string };

function isDeckContext(value: unknown): value is DeckContext {
  if (!value || typeof value !== 'object') return false;
  const deck = value as Record<string, unknown>;
  return typeof deck.sourceName === 'string' && deck.sourceName.trim().length > 0
    && Array.isArray(deck.slides)
    && deck.slides.length > 0
    && deck.slides.every((slide) => slide && typeof slide === 'object'
      && Number.isInteger((slide as Record<string, unknown>).index)
      && typeof (slide as Record<string, unknown>).text === 'string'
      && typeof (slide as Record<string, unknown>).imageUrl === 'string');
}

export function parseDefenseSessionResponse(value: unknown): DefenseSession | null {
  if (!value || typeof value !== 'object' || !('defense' in value)) return null;
  const defense = value.defense;
  if (!defense || typeof defense !== 'object') return null;
  const session = defense as Record<string, unknown>;
  const parsedDeck = defenseDeckSchema.safeParse(session.deck);
  const deck = parsedDeck.success ? parsedDeck.data : (isDeckContext(session.deck) ? (session.deck as DeckContext) : null);
  const segments = Array.isArray(session.transcriptSegments) ? session.transcriptSegments : transcriptSegmentsSchema.safeParse(session.transcriptSegments).data;
  const events = Array.isArray(session.examinerEvents) ? session.examinerEvents : examinerEventsSchema.safeParse(session.examinerEvents).data;
  if (!deck || !segments || !events) return null;
  if (session.mode !== 'uninterrupted' && session.mode !== 'diagnostic' && session.mode !== 'mock' && session.mode !== 'guided') return null;
  const validStance: ExaminerStance = session.stance === 'supportive' || session.stance === 'rigorous' || session.stance === 'hostile' || session.stance === 'custom' ? session.stance : 'supportive';
  if (typeof session.id !== 'string') return null;
  return {
    id: session.id,
    deck,
    mode: session.mode,
    stance: validStance,
    transcriptSegments: segments,
    examinerEvents: events,
    status: typeof session.status === 'string' ? session.status : 'upload',
  };
}

export default function PracticeSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string>();
  const [session, setSession] = useState<DefenseSession>();
  const [error, setError] = useState<string>();
  const view = searchParams.get('view');

  useEffect(() => {
    void params.then(({ sessionId: value }) => setSessionId(value));
  }, [params]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const loadSession = async () => {
      try {
        const response = await authenticatedFetch(`/api/session/${sessionId}`);
        const body = await response.json();
        const defense = response.ok ? parseDefenseSessionResponse(body) : null;
        if (!defense) throw new Error(response.ok ? 'This defense session is missing its deck context.' : body.error || 'Unable to load this defense session.');
        if (active) setSession(defense);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load this defense session.');
      }
    };
    void loadSession();
    return () => { active = false; };
  }, [sessionId, view]);

  if (view === 'room') {
    if (error) return <p role="alert" className="m-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>;
    return session ? <RehearsalRoom session={session} onComplete={() => router.push(`/reports/${session.id}`)} /> : <p role="status" className="p-6 text-sm text-muted-foreground">Loading rehearsal room...</p>;
  }

  return <AppShell active="rehearse">{error ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p> : sessionId && session ? <PracticeSetup sessionId={sessionId} deck={session.deck} initialMode={session.mode} initialStance={session.stance} onReady={() => router.push(`/practice/${sessionId}?view=room`)} /> : <p role="status" className="text-sm text-muted-foreground">Loading defense setup...</p>}</AppShell>;
}
