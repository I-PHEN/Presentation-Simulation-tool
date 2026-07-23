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
});
