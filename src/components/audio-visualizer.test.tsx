import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AudioVisualizer } from './audio-visualizer';

describe('AudioVisualizer', () => {
  it('renders input (mic) visualizer with emerald/cyan glowing styling when active', () => {
    const html = renderToStaticMarkup(<AudioVisualizer isActive type="input" />);
    expect(html).toContain('from-emerald-500');
    expect(html).toContain('to-cyan-400');
    expect(html).toContain('animation:sp-eq');
  });

  it('renders output (Cartesia TTS) visualizer with violet/indigo glowing styling when active', () => {
    const html = renderToStaticMarkup(<AudioVisualizer isActive type="output" />);
    expect(html).toContain('from-indigo-500');
    expect(html).toContain('to-violet-400');
    expect(html).toContain('animation:sp-eq');
  });

  it('supports variant="speaker" mapping to output type', () => {
    const html = renderToStaticMarkup(<AudioVisualizer isActive variant="speaker" />);
    expect(html).toContain('from-indigo-500');
    expect(html).toContain('to-violet-400');
  });

  it('renders the requested barCount', () => {
    const html = renderToStaticMarkup(<AudioVisualizer isActive barCount={7} />);
    const matches = html.match(/<span/g);
    expect(matches).toHaveLength(7);
  });

  it('renders inactive state flat when isActive is false', () => {
    const html = renderToStaticMarkup(<AudioVisualizer isActive={false} />);
    expect(html).not.toContain('animation:sp-eq');
    expect(html).toContain('bg-muted-foreground/30');
  });

  it('handles stream and audioNode props without error', () => {
    const mockStream = {} as MediaStream;
    const mockAudioNode = {} as AudioNode;
    expect(() =>
      renderToStaticMarkup(
        <AudioVisualizer isActive stream={mockStream} audioNode={mockAudioNode} type="input" />,
      ),
    ).not.toThrow();
  });
});
