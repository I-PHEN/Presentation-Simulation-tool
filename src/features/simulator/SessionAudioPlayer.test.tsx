import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SessionAudioPlayer } from './SessionAudioPlayer';

describe('SessionAudioPlayer', () => {
  it('renders an audio player over the recording path', () => {
    const html = renderToStaticMarkup(<SessionAudioPlayer audioPath="/recordings/sess-1.webm" />);
    expect(html).toContain('Session recording');
    expect(html).toContain('controls');
    expect(html).toContain('src="/recordings/sess-1.webm"');
  });

  it('renders an honest empty state when there is no recording', () => {
    const html = renderToStaticMarkup(<SessionAudioPlayer audioPath={null} />);
    expect(html).toContain('No recording was captured for this session.');
    expect(html).not.toContain('<audio');
  });
});
