import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { beginDeckReplacement, DeckIntake, parseUploadedDeck } from './deck-intake';

describe('DeckIntake', () => {
  it('names every supported deck format and exposes an upload input', () => {
    const html = renderToStaticMarkup(<DeckIntake onDeckReady={() => undefined} />);
    expect(html).toContain('PPTX');
    expect(html).toContain('PPT');
    expect(html).toContain('PDF');
    expect(html).toContain('type="file"');
  });

  it('rejects malformed successful upload responses', () => {
    expect(parseUploadedDeck({ deck: { sourceName: '', slides: [] } })).toBeNull();
    expect(parseUploadedDeck({ deck: { sourceName: 'Thesis.pdf', slides: [{ index: 0, text: '', imageUrl: '/slide.png' }] } })).toBeNull();
    expect(parseUploadedDeck({ deck: { sourceName: 'Thesis.pdf', slides: [{ index: 1, text: 42, imageUrl: '/slide.png' }] } })).toBeNull();
  });

  it('accepts a complete deck context from a successful upload response', () => {
    expect(parseUploadedDeck({ deck: { sourceName: 'Thesis.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide.png' }] } })).toEqual({
      sourceName: 'Thesis.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide.png' }],
    });
  });

  it('clears the parent deck before a replacement upload can leave a stale continuation active', () => {
    let activeDeck: { sourceName: string } | undefined = { sourceName: 'Previous.pdf' };
    beginDeckReplacement(() => { activeDeck = undefined; });
    expect(activeDeck).toBeUndefined();
  });
});
