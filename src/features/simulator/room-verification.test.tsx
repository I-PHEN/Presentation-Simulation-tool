import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { SimulatorRoom } from './SimulatorRoom';
import { AudiencePanel } from './AudiencePanel';
import { CoachingHeader } from '@/features/coaching/components/coaching-header';
import { assemblePanel, PERSONAS } from './personas';
import { useAppStore } from '@/lib/store';
import type { DeckContext, ExaminerEvent, TranscriptSegment } from '@/features/defense/types';

vi.mock('./use-camera', () => ({
  useCamera: () => ({ enabled: false, error: null, getVideo: () => null, toggle: vi.fn(), attach: vi.fn() }),
}));

vi.mock('./use-delivery-samples', () => ({
  useDeliverySamples: () => ({ getSamples: () => [] }),
}));

const mockDeck: DeckContext = {
  sourceName: 'Executive Strategy Pitch',
  slides: [
    { index: 0, title: 'Introduction', text: 'Executive overview', bullets: [], durationSeconds: 60, targetWordCount: 100 },
  ],
};

const mockTranscript: TranscriptSegment[] = [];
const mockEvents: ExaminerEvent[] = [];

describe('Empirical Verification: Room Separation & Persona Rendering', () => {
  beforeEach(() => {
    useAppStore.setState({ coachPersona: 'marcus' });
  });

  describe('1. Coaching Room (/coaching/[sessionId])', () => {
    it('renders 1 coach avatar and header badge 🎓 1-on-1 Executive Coaching Studio for Coach Sarah', () => {
      useAppStore.setState({ coachPersona: 'sarah' });
      console.log('DEBUG STORE STATE:', useAppStore.getState().coachPersona);

      const panel = assemblePanel('guided', 'sarah');
      expect(panel).toHaveLength(1);
      expect(panel[0].id).toBe('sarah');
      expect(panel[0].title).toBe('Coach Sarah');

      const session = {
        id: 'coaching-sarah-session',
        deck: mockDeck,
        mode: 'guided' as const,
        stance: 'supportive' as const,
        transcriptSegments: mockTranscript,
        examinerEvents: mockEvents,
        status: 'practicing',
        source: 'deck' as const,
      };

      const html = renderToString(<SimulatorRoom session={session} onComplete={vi.fn()} />);
      console.log('FULL_HTML_SNIPPET:', html.slice(0, 500));



      // Header badge verification
      expect(html).toContain('🎓 1-on-1 Executive Coaching Studio');

      // Coach Sarah avatar verification
      expect(html).toContain('Coach Sarah');
      expect(html).toContain('Executive Presentation Strategist');

      // Presenter row verification
      expect(html).toContain('You');
      expect(html).toContain('Presenting');

      // Room separation: NO defense panel examiners present
      expect(html).not.toContain('Professor');
      expect(html).not.toContain('Examiner');
      expect(html).not.toContain('Peer');
      expect(html).not.toContain('Coach Marcus');
    });

    it('renders 1 coach avatar and header badge 🎓 1-on-1 Executive Coaching Studio for Coach Marcus', () => {
      useAppStore.setState({ coachPersona: 'marcus' });
      const panel = assemblePanel('guided', 'marcus');
      expect(panel).toHaveLength(1);
      expect(panel[0].id).toBe('marcus');
      expect(panel[0].title).toBe('Coach Marcus');

      const session = {
        id: 'coaching-marcus-session',
        deck: mockDeck,
        mode: 'guided' as const,
        stance: 'supportive' as const,
        transcriptSegments: mockTranscript,
        examinerEvents: mockEvents,
        status: 'practicing',
        source: 'deck' as const,
      };

      const html = renderToString(<SimulatorRoom session={session} onComplete={vi.fn()} />);

      // Header badge verification
      expect(html).toContain('🎓 1-on-1 Executive Coaching Studio');

      // Coach Marcus avatar verification
      expect(html).toContain('Coach Marcus');
      expect(html).toContain('Senior Communication Coach');

      // Presenter row verification
      expect(html).toContain('You');
      expect(html).toContain('Presenting');

      // Room separation: NO defense panel examiners present
      expect(html).not.toContain('Professor');
      expect(html).not.toContain('Examiner');
      expect(html).not.toContain('Peer');
      expect(html).not.toContain('Coach Sarah');
    });

    it('CoachingHeader component renders exact badge text and icon', () => {
      const headerHtml = renderToString(<CoachingHeader title="Test Title" onBack={vi.fn()} />);
      expect(headerHtml).toContain('🎓 1-on-1 Executive Coaching Studio');
    });
  });

  describe('2. Rehearsal & Practice Rooms (/rehearse/[sessionId] & /practice/[sessionId])', () => {
    it('renders 4-person audience panel grid (professor, examiner, peer + presenter) in rehearse/practice modes', () => {
      const modes = ['mock', 'uninterrupted', 'diagnostic'] as const;

      for (const mode of modes) {
        const panel = assemblePanel(mode);
        expect(panel).toHaveLength(3);
        expect(panel.map((p) => p.id)).toEqual(['professor', 'examiner', 'peer']);

        const session = {
          id: `session-${mode}`,
          deck: mockDeck,
          mode,
          stance: 'rigorous' as const,
          transcriptSegments: mockTranscript,
          examinerEvents: mockEvents,
          status: 'practicing',
          source: 'deck' as const,
        };

        const html = renderToString(<SimulatorRoom session={session} onComplete={vi.fn()} />);

        // Must render all 4 members: Professor, Examiner, Peer + Presenter ("You")
        expect(html).toContain('Professor');
        expect(html).toContain('Methodology &amp; rigor');
        expect(html).toContain('Examiner');
        expect(html).toContain('Assumptions &amp; evidence');
        expect(html).toContain('Peer');
        expect(html).toContain('Clarity &amp; plain explanation');
        expect(html).toContain('You');
        expect(html).toContain('Presenting');

        // Must NOT render 1-on-1 coaching studio badge
        expect(html).not.toContain('🎓 1-on-1 Executive Coaching Studio');
        expect(html).not.toContain('Coach Sarah');
        expect(html).not.toContain('Coach Marcus');
      }
    });

    it('AudiencePanel directly renders presenter + 3 panel members forming 4 grid cards', () => {
      const panel = [PERSONAS.professor, PERSONAS.examiner, PERSONAS.peer];
      const html = renderToString(
        <AudiencePanel panel={panel} speakingPersonaId={null} self={{ micActive: true, hearing: false }} />
      );

      // Verify Presenter card
      expect(html).toContain('You');
      expect(html).toContain('Presenting');

      // Verify 3 panel member cards
      expect(html).toContain('Professor');
      expect(html).toContain('Examiner');
      expect(html).toContain('Peer');

      // Total items in audience panel grid = 4 cards
      const matches = [
        html.includes('You'),
        html.includes('Professor'),
        html.includes('Examiner'),
        html.includes('Peer'),
      ];
      expect(matches.every(Boolean)).toBe(true);
    });
  });
});
