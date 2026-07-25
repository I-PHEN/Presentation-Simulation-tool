import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RehearseSourcePicker, TopicComingSoon } from './rehearse-source-picker';

describe('RehearseSourcePicker', () => {
  it('offers both a deck and a topic source', () => {
    const html = renderToStaticMarkup(<RehearseSourcePicker source="deck" onSelect={() => undefined} />);
    expect(html).toContain('>Deck<');
    expect(html).toContain('>Topic<');
    expect(html).toContain('What are you rehearsing against?');
  });

  it('marks exactly the active source as pressed', () => {
    const deckActive = renderToStaticMarkup(<RehearseSourcePicker source="deck" onSelect={() => undefined} />);
    expect(deckActive.match(/aria-pressed="true"/g)).toHaveLength(1);

    const topicActive = renderToStaticMarkup(<RehearseSourcePicker source="topic" onSelect={() => undefined} />);
    expect(topicActive.match(/aria-pressed="true"/g)).toHaveLength(1);
    // The two renders must differ in which option is pressed.
    expect(deckActive).not.toEqual(topicActive);
  });
});

describe('TopicComingSoon', () => {
  it('honestly signals topic mode is not built yet and points to Deck', () => {
    const html = renderToStaticMarkup(<TopicComingSoon />);
    expect(html).toContain('coming next');
    expect(html).toContain('Deck');
  });
});
