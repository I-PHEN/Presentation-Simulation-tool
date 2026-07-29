import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RehearseSetup, buildRehearseSessionPayload } from './rehearse-setup';

const deck = {
  sourceName: 'Thesis.pdf',
  slides: [{ index: 1, text: 'Opening argument', imageUrl: '/slides/1.png' }],
};

describe('buildRehearseSessionPayload', () => {
  it('passes the chosen title, mode, stance, and deck straight through', () => {
    expect(
      buildRehearseSessionPayload({ deck, title: 'Final defense', mode: 'mock', stance: 'supportive' }),
    ).toEqual({ title: 'Final defense', mode: 'mock', stance: 'supportive', deck });
  });

  it('falls back to the deck source name when the title is blank', () => {
    expect(
      buildRehearseSessionPayload({ deck, title: '   ', mode: 'diagnostic', stance: 'rigorous' }),
    ).toEqual({ title: 'Thesis.pdf', mode: 'diagnostic', stance: 'rigorous', deck });
  });
});

describe('RehearseSetup', () => {
  it('renders both guided steps with deck-only source and the room conditions', () => {
    const html = renderToStaticMarkup(<RehearseSetup onStart={() => undefined} />);

    // Two-step framing
    expect(html).toContain('What are you rehearsing?');
    expect(html).toContain('in the room?');
    // Step 1 = deck upload only
    expect(html).toContain('Presentation deck (PPTX, PPT, or PDF)');
    // Deck-only honesty: no other sources, not even placeholders
    expect(html).not.toContain('Share screen');
    expect(html).not.toContain('Screen share');
    expect(html).not.toContain('Topic prompt');
    expect(html).not.toContain('Coming soon');
    // Step 2 = the real conditions we support today
    expect(html).toContain('Uninterrupted presentation');
    expect(html).toContain('Diagnostic sparring');
    expect(html).toContain('Mock defense');
    expect(html).toContain('Rigorous');
    expect(html).toContain('Supportive');
    expect(html.match(/name="rehearse-mode"/g)).toHaveLength(3);
    expect(html.match(/name="rehearse-stance"/g)).toHaveLength(2);
    // No fabricated audience controls
    expect(html).not.toContain('Audience type');
    expect(html).not.toContain('AI Panel');
    expect(html).not.toContain('audience size');
  });

  it('disables the start action until a deck is uploaded', () => {
    const html = renderToStaticMarkup(<RehearseSetup onStart={() => undefined} />);

    expect(html).toContain('Start rehearsal');
    // The primary action is disabled in the initial (no-deck) state.
    expect(html).toMatch(/Start rehearsal<\/button>/);
    expect(html).toContain('disabled=""');
  });

  it('shows the creating label and the start error when provided', () => {
    const html = renderToStaticMarkup(
      <RehearseSetup onStart={() => undefined} creating startError="The service is busy." />,
    );

    expect(html).toContain('Starting rehearsal...');
    expect(html).toContain('The service is busy.');
    expect(html).toContain('role="alert"');
  });
});
