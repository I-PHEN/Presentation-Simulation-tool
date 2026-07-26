import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AudiencePanel, selfStatus } from './AudiencePanel';
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

  it('animates only the voice that is actually active', () => {
    const idle = renderToStaticMarkup(<AudiencePanel panel={panel} speakingPersonaId={null} />);
    expect(idle).not.toContain('animate-[sp-eq');
    // One speaker => exactly one set of three animated bars.
    const speaking = renderToStaticMarkup(<AudiencePanel panel={panel} speakingPersonaId="professor" />);
    expect(speaking.match(/animate-\[sp-eq/g)).toHaveLength(3);
  });

  it('adds a You row for the presenter only when capture state is supplied', () => {
    expect(renderToStaticMarkup(<AudiencePanel panel={panel} speakingPersonaId={null} />)).not.toContain('>You<');
    const withSelf = renderToStaticMarkup(
      <AudiencePanel panel={panel} speakingPersonaId={null} self={{ micActive: true, hearing: true }} />,
    );
    expect(withSelf).toContain('>You<');
    expect(withSelf).toContain('Presenting');
  });
});

describe('selfStatus', () => {
  it('reads the mic state honestly, never claiming speech while muted', () => {
    expect(selfStatus({ micActive: false, hearing: false })).toEqual({ label: 'Mic off', active: false });
    expect(selfStatus({ micActive: false, hearing: true })).toEqual({ label: 'Mic off', active: false });
  });

  it('distinguishes waiting for you from hearing you', () => {
    expect(selfStatus({ micActive: true, hearing: false })).toEqual({ label: 'Listening for you', active: false });
    expect(selfStatus({ micActive: true, hearing: true })).toEqual({ label: 'Speaking', active: true });
  });
});
