import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SimulatorToolbar } from './SimulatorToolbar';

describe('SimulatorToolbar', () => {
  it('renders mic, participants, transcript, and a destructive End control', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).toContain('aria-label="Mute microphone"'); // active => offers mute
    expect(html).toContain('aria-label="Show participants"');
    expect(html).toContain('aria-label="Show transcript"');
    expect(html).toContain('End rehearsal');
  });

  it('labels the mic control to turn on when inactive', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar micActive={false} onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).toContain('aria-label="Turn on microphone"');
  });

  it('shows a recording indicator while recording', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar recording micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).toContain('Rec');
    expect(html).toContain('aria-label="Recording in progress"');
  });

  it('hides the recording indicator when not recording', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar recording={false} micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).not.toContain('aria-label="Recording in progress"');
  });

  it('carries slide navigation, so the stage keeps its height for the slide', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined}
        slideNav={{ onPrev: () => undefined, onNext: () => undefined, prevDisabled: false, nextDisabled: false }} />,
    );
    expect(html).toContain('aria-label="Previous slide"');
    expect(html).toContain('aria-label="Next slide"');
  });

  it('disables each end of the deck', () => {
    // Match `disabled=""`, the real attribute - a bare /disabled/ also hits the
    // `disabled:opacity-50` utility class and passes no matter what is rendered.
    const first = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined}
        slideNav={{ onPrev: () => undefined, onNext: () => undefined, prevDisabled: true, nextDisabled: false }} />,
    );
    expect(first).toMatch(/aria-label="Previous slide"[^>]*disabled=""/);
    expect(first).not.toMatch(/aria-label="Next slide"[^>]*disabled=""/);

    const last = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined}
        slideNav={{ onPrev: () => undefined, onNext: () => undefined, prevDisabled: false, nextDisabled: true }} />,
    );
    expect(last).toMatch(/aria-label="Next slide"[^>]*disabled=""/);
    expect(last).not.toMatch(/aria-label="Previous slide"[^>]*disabled=""/);
  });

  it('omits slide navigation entirely in topic mode, which has one card', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).not.toContain('Previous slide');
    expect(html).not.toContain('Next slide');
  });
});
