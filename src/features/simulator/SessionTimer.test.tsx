import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SessionTimer } from './SessionTimer';

// Fixed origin so the rendered clock is deterministic.
const startedAtMs = Date.now() - 134_000; // 2:14 in

describe('SessionTimer', () => {
  it('renders the elapsed clock', () => {
    const html = renderToStaticMarkup(<SessionTimer startedAtMs={startedAtMs} targetMs={null} onCycleTarget={() => undefined} />);
    expect(html).toContain('2:14');
    expect(html).toContain('data-pace="none"');
    expect(html).toContain('Set a time target');
  });

  it('shows the target alongside the clock once one is set', () => {
    const html = renderToStaticMarkup(<SessionTimer startedAtMs={startedAtMs} targetMs={600_000} onCycleTarget={() => undefined} />);
    expect(html).toContain('2:14');
    expect(html).toContain('10:00');
    expect(html).toContain('data-pace="ok"');
  });

  it('escalates as the target approaches and passes', () => {
    const close = renderToStaticMarkup(<SessionTimer startedAtMs={Date.now() - 530_000} targetMs={600_000} onCycleTarget={() => undefined} />);
    expect(close).toContain('data-pace="close"');
    expect(close).toContain('text-warning');

    const over = renderToStaticMarkup(<SessionTimer startedAtMs={Date.now() - 660_000} targetMs={600_000} onCycleTarget={() => undefined} />);
    expect(over).toContain('data-pace="over"');
    expect(over).toContain('text-destructive');
  });
});
