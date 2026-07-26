import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AudiencePanel } from './AudiencePanel';
import { assemblePanel } from './personas';

const panel = assemblePanel();

describe('AudiencePanel', () => {
  it('renders a card for every panel member with its title and focus', () => {
    const html = renderToStaticMarkup(<AudiencePanel panel={panel} speakingPersonaId={null} />);
    // Note: renderToStaticMarkup encodes '&' as '&amp;', so assert the ampersand-free lead word of each focus.
    for (const p of panel) { expect(html).toContain(p.title); expect(html).toContain(p.focus.split(' & ')[0]); }
    expect(html).toContain('aria-label="Audience panel"');
  });

  it('marks who is speaking; the others listen', () => {
    const html = renderToStaticMarkup(<AudiencePanel panel={panel} speakingPersonaId="professor" />);
    expect(html).toContain('data-state="speaking"');
    expect(html).toContain('data-state="listening"');
  });
});
