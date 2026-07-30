import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import RehearseRoomPage from './page';
import { SimulatorRoom } from '@/features/simulator/SimulatorRoom';
import type { DeckContext, ExaminerEvent, TranscriptSegment } from '@/features/defense/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/lib/authenticated-fetch', () => ({
  authenticatedFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      defense: {
        id: 'test-rehearse-session-1',
        deck: {
          sourceName: 'Rehearsal Deck',
          slides: [{ index: 0, title: 'Intro', text: 'Slide 1', bullets: [], durationSeconds: 60, targetWordCount: 100 }],
        },
        mode: 'mock',
        stance: 'rigorous',
        transcriptSegments: [],
        examinerEvents: [],
        status: 'practicing',
        source: 'deck',
      },
    }),
  }),
}));

vi.mock('@/features/simulator/use-camera', () => ({
  useCamera: () => ({ enabled: false, error: null, getVideo: () => null, toggle: vi.fn(), attach: vi.fn() }),
}));

vi.mock('@/features/simulator/use-delivery-samples', () => ({
  useDeliverySamples: () => ({ getSamples: () => [] }),
}));

const mockDeck: DeckContext = {
  sourceName: 'Sample Pitch Deck',
  slides: [
    { index: 0, title: 'Introduction', text: 'Welcome to our pitch', bullets: [], durationSeconds: 60, targetWordCount: 100 },
  ],
};

const mockTranscript: TranscriptSegment[] = [];
const mockEvents: ExaminerEvent[] = [];

describe('/rehearse/[sessionId] route', () => {
  it('renders Defense Simulator with full 4-person panel grid (Professor, Examiner, Peer + Presenter)', () => {
    const session = {
      id: 'rehearse-session-1',
      deck: mockDeck,
      mode: 'mock' as const,
      stance: 'rigorous' as const,
      transcriptSegments: mockTranscript,
      examinerEvents: mockEvents,
      status: 'practicing',
      source: 'deck' as const,
    };

    const html = renderToString(<SimulatorRoom session={session} onComplete={vi.fn()} />);

    // Preserved Defense Simulator displays full 4-person panel grid
    expect(html).toContain('Professor');
    expect(html).toContain('Examiner');
    expect(html).toContain('Peer');
    expect(html).toContain('Room Mood');
    expect(html).toContain('Skepticism');
    expect(html).not.toContain('🎓 1-on-1 Executive Coaching Studio');
  });

  it('renders initial loading state for RehearseRoomPage component', () => {
    const html = renderToString(<RehearseRoomPage params={Promise.resolve({ sessionId: 'test-rehearse-session-1' })} />);
    expect(html).toContain('Loading your rehearsal room...');
  });
});
