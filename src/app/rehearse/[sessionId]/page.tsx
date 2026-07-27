'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SimulatorRoom } from '@/features/simulator/SimulatorRoom';
import type { DeckContext, DefenseMode, ExaminerEvent, ExaminerStance, TranscriptSegment } from '@/features/defense/types';
import { defenseDeckSchema, examinerEventsSchema, transcriptSegmentsSchema } from '@/features/defense/session-schema';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

type SimSession = { id: string; deck: DeckContext; mode: DefenseMode; stance: ExaminerStance; transcriptSegments: TranscriptSegment[]; examinerEvents: ExaminerEvent[]; status: string; source: 'deck' | 'topic' };

function parseSession(value: unknown): SimSession | null {
  if (!value || typeof value !== 'object' || !('defense' in value)) return null;
  const d = (value as { defense: unknown }).defense;
  if (!d || typeof d !== 'object') return null;
  const s = d as Record<string, unknown>;
  const deck = defenseDeckSchema.safeParse(s.deck);
  const segments = transcriptSegmentsSchema.safeParse(s.transcriptSegments);
  const events = examinerEventsSchema.safeParse(s.examinerEvents);
  if (!deck.success || !segments.success || !events.success) return null;
  if (s.mode !== 'uninterrupted' && s.mode !== 'diagnostic' && s.mode !== 'mock') return null;
  if (s.stance !== 'rigorous' && s.stance !== 'supportive' && s.stance !== 'hostile') return null;
  if (typeof s.id !== 'string') return null;
  return { id: s.id, deck: deck.data, mode: s.mode, stance: s.stance, transcriptSegments: segments.data, examinerEvents: events.data, status: typeof s.status === 'string' ? s.status : 'practicing', source: s.source === 'topic' ? 'topic' : 'deck' };
}

export default function RehearseRoomPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>();
  const [session, setSession] = useState<SimSession>();
  const [error, setError] = useState<string>();

  useEffect(() => { void params.then(({ sessionId: value }) => setSessionId(value)); }, [params]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    (async () => {
      try {
        const response = await authenticatedFetch(`/api/session/${sessionId}`);
        const body = await response.json();
        const parsed = response.ok ? parseSession(body) : null;
        if (!parsed) throw new Error(response.ok ? 'This rehearsal session is missing its deck.' : body.error || 'Unable to load this rehearsal.');
        if (active) setSession(parsed);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load this rehearsal.');
      }
    })();
    return () => { active = false; };
  }, [sessionId]);

  if (error) return <p role="alert" className="m-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>;
  if (!session) return <p role="status" className="p-6 text-sm text-muted-foreground">Loading your rehearsal room...</p>;
  return <SimulatorRoom session={session} onComplete={() => router.push(`/reports/${session.id}`)} />;
}
