import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InterestsPicker } from './interests-picker';

const noop = () => undefined;

describe('InterestsPicker', () => {
  it('renders the curated chips plus Continue and Skip', () => {
    const html = renderToStaticMarkup(
      <InterestsPicker selected={[]} onToggle={noop} onAddCustom={noop} onContinue={noop} onSkip={noop} />,
    );
    expect(html).toContain('Artificial intelligence');
    expect(html).toContain('Add your own');
    expect(html).toContain('Continue');
    expect(html).toContain('Skip for now');
  });

  it('marks only the selected interests as pressed and renders custom extras as chips', () => {
    const html = renderToStaticMarkup(
      <InterestsPicker selected={['History', 'Robotics']} onToggle={noop} onAddCustom={noop} onContinue={noop} onSkip={noop} />,
    );
    // History (curated) + Robotics (custom extra) both selected.
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    expect(html).toContain('Robotics');
  });

  it('shows the saving label when a save is in flight', () => {
    const html = renderToStaticMarkup(
      <InterestsPicker selected={[]} onToggle={noop} onAddCustom={noop} onContinue={noop} onSkip={noop} saving />,
    );
    expect(html).toContain('Saving...');
  });
});
