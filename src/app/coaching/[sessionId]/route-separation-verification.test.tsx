import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import CoachingRoomPage from './page';
import { CoachingRoom } from '@/features/coaching/components/coaching-room';
import { CoachRescueModal } from '@/features/coaching/components/coach-rescue-modal';
import { SimulatorRoom } from '@/features/simulator/SimulatorRoom';
import type { DeckContext, ExaminerEvent, TranscriptSegment } from '@/features/defense/types';

vi.mock('@radix-ui/react-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@radix-ui/react-dialog')>();
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <div data-slot="dialog-portal-mock">{children}</div>,
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/authenticated-fetch', () => ({
  authenticatedFetch: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      id: 'test-coaching-session-101',
      topic: 'Executive Presentation Strategy',
      slides: [{ index: 1, text: 'Executive Strategy Overview', imageUrl: 'topic' }],
    }),
  }),
}));

vi.mock('@/features/onboarding/use-onboarding', () => ({
  useOnboardingGuard: vi.fn(),
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

describe('Milestone 4 Iteration 2 Route Separation & Component Rendering Verification', () => {
  describe('/coaching/[sessionId] Component & Route Verification', () => {
    it('1. Mounts CoachingRoom Page and confirms presence of CoachingRoom', () => {
      const htmlPage = renderToString(<CoachingRoomPage params={{ sessionId: 'test-coaching-session-101' }} />);
      const htmlRoom = renderToString(<CoachingRoom sessionId="test-coaching-session-101" />);
      
      expect(htmlPage).toBeTruthy();
      expect(htmlRoom).toBeTruthy();
      expect(htmlPage).toContain('Coaching Session');
      expect(htmlRoom).toContain('Coaching Session');
    });

    it('2. Asserts presence of "🎓 1-on-1 Executive Coaching Studio" badge in CoachingHeader', () => {
      const html = renderToString(<CoachingRoom sessionId="test-coaching-session-101" />);
      expect(html).toContain('🎓 1-on-1 Executive Coaching Studio');
      expect(html).toContain('data-testid="coaching-studio-badge"');
    });

    it('3. Asserts presence of 1 Coach Avatar (Coach Sarah or Coach Marcus with AI Coach indicator)', () => {
      const html = renderToString(<CoachingRoom sessionId="test-coaching-session-101" />);
      const hasCoachSarah = html.includes('Coach Sarah');
      const hasCoachMarcus = html.includes('Coach Marcus');
      expect(hasCoachSarah || hasCoachMarcus).toBe(true);
      expect(html).toContain('AI Coach');
    });

    it('4. Asserts presence of 2-row teleprompter (Row 1: Opening Hook, Row 2: 3 Triad Points)', () => {
      const html = renderToString(<CoachingRoom sessionId="test-coaching-session-101" />);
      // Row 1: Opening Hook
      expect(html).toContain('Hook (0-15s):');
      // Row 2: 3 Triad Points (Context, Solution, Impact)
      expect(html).toContain('Context:');
      expect(html).toContain('Solution:');
      expect(html).toContain('Impact:');
    });

    it('5. Asserts presence of "Optimal Cadence (130-150 WPM)" WPM meter', () => {
      const html = renderToString(<CoachingRoom sessionId="test-coaching-session-101" />);
      expect(html).toContain('Optimal Cadence (130-150 WPM)');
      expect(html).toContain('Live Speech Tempo');
    });

    it('6. Asserts presence of "🎙️ Ask Coach for Live Advice" primary button', () => {
      const html = renderToString(<CoachingRoom sessionId="test-coaching-session-101" />);
      expect(html).toContain('🎙️ Ask Coach for Live Advice');
    });

    it('7. Asserts presence of "✨ Coach Rescue: Model Pitch Script" secondary button and renders CoachRescueModal', () => {
      const htmlRoom = renderToString(<CoachingRoom sessionId="test-coaching-session-101" />);
      expect(htmlRoom).toContain('✨ Coach Rescue: Model Pitch Script');

      const modalHtml = renderToString(
        <CoachRescueModal
          open={true}
          onOpenChange={vi.fn()}
          script={{
            openingHook: 'Capture attention immediately with your main takeaway.',
            talkingPoints: ['Context: Bottleneck', 'Solution: Detail strategy', 'Impact: Call to action'],
            rescueScript: 'Executive level pitch script content.',
          }}
          coachPersona="sarah"
          onPlayAudio={vi.fn()}
          isPlayingAudio={false}
        />
      );
      expect(modalHtml).toContain('Model Pitch Script');
      expect(modalHtml).toContain('Coach Rescue Active');
      expect(modalHtml).toContain('Opening Hook');
      expect(modalHtml).toContain('Full Executive Delivery Script');
      expect(modalHtml).toContain('Listen to Coach Voiceover');
    });

    it('8. Asserts explicit ABSENCE of "Room Mood" and "Skepticism 35%/78%" (and Defense Simulator panel personas)', () => {
      const html = renderToString(<CoachingRoom sessionId="test-coaching-session-101" />);
      expect(html).not.toContain('Room Mood');
      expect(html).not.toContain('Skepticism');
      expect(html).not.toContain('Skepticism 35%/78%');
      expect(html).not.toContain('Professor');
      expect(html).not.toContain('Examiner');
      expect(html).not.toContain('Peer');
    });
  });

  describe('Route Separation Contrast: /coaching vs /rehearse', () => {
    it('verifies /rehearse renders Defense Simulator panel widgets while /coaching does not', () => {
      const session = {
        id: 'rehearse-session-1',
        deck: mockDeck,
        mode: 'mock' as const,
        stance: 'rigorous' as const,
        transcriptSegments: [] as TranscriptSegment[],
        examinerEvents: [] as ExaminerEvent[],
        status: 'practicing',
        source: 'deck' as const,
      };

      const rehearseHtml = renderToString(<SimulatorRoom session={session} onComplete={vi.fn()} />);
      const coachingHtml = renderToString(<CoachingRoom sessionId="test-coaching-session-101" />);

      // Rehearse contains Defense Simulator features
      expect(rehearseHtml).toContain('Room Mood');
      expect(rehearseHtml).toContain('Skepticism');
      expect(rehearseHtml).toContain('Professor');
      expect(rehearseHtml).toContain('Examiner');
      expect(rehearseHtml).toContain('Peer');
      expect(rehearseHtml).not.toContain('🎓 1-on-1 Executive Coaching Studio');

      // Coaching contains Executive Coaching features and NOT Defense Simulator features
      expect(coachingHtml).toContain('🎓 1-on-1 Executive Coaching Studio');
      expect(coachingHtml).not.toContain('Room Mood');
      expect(coachingHtml).not.toContain('Skepticism');
      expect(coachingHtml).not.toContain('Professor');
    });
  });
});
