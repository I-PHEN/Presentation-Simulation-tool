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

  it('offers a maximize control only when the room wires one up', () => {
    const without = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(without).not.toContain('Maximize presentation');

    const collapsed = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} onToggleMaximized={() => undefined} />,
    );
    expect(collapsed).toContain('aria-label="Maximize presentation"');

    const expanded = renderToStaticMarkup(
      <SimulatorToolbar micActive maximized onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} onToggleMaximized={() => undefined} />,
    );
    expect(expanded).toContain('aria-label="Exit full screen"');
  });

  it('shows live mic activity, and only while the mic is on', () => {
    const muted = renderToStaticMarkup(
      <SimulatorToolbar micActive={false} hearing onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(muted).not.toContain('animate-[sp-eq'); // muted never animates, whatever `hearing` says

    const listening = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(listening).toContain('Listening');
    expect(listening).not.toContain('animate-[sp-eq');

    const speaking = renderToStaticMarkup(
      <SimulatorToolbar micActive hearing onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(speaking).toContain('Speaking');
    expect(speaking.match(/animate-\[sp-eq/g)).toHaveLength(3);
  });

  it('omits slide navigation entirely in topic mode, which has one card', () => {
    const html = renderToStaticMarkup(
      <SimulatorToolbar micActive onToggleMic={() => undefined} onToggleParticipants={() => undefined} onToggleTranscript={() => undefined} onEnd={() => undefined} />,
    );
    expect(html).not.toContain('Previous slide');
    expect(html).not.toContain('Next slide');
  });
});
