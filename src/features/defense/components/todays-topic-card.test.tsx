import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TodaysTopicCard } from './todays-topic-card';

describe('TodaysTopicCard', () => {
  it('surfaces a recommended topic with a rehearse action', () => {
    const html = renderToStaticMarkup(<TodaysTopicCard topic="Should AI be regulated?" hasInterests />);
    expect(html).toContain('Today&#x27;s topic');
    expect(html).toContain('Should AI be regulated?');
    expect(html).toContain('Rehearse this');
  });

  it('carries the topic into setup so Rehearse never lands on the deck upload', () => {
    const html = renderToStaticMarkup(<TodaysTopicCard topic="Should AI be regulated?" hasInterests />);
    expect(html).toContain('href="/decks/new?source=topic&amp;topic=Should%20AI%20be%20regulated%3F"');
  });

  it('invites a user with no interests to pick them', () => {
    const html = renderToStaticMarkup(<TodaysTopicCard hasInterests={false} />);
    expect(html).toContain('Pick your interests');
    expect(html).toContain('href="/welcome"');
    expect(html).not.toContain('Rehearse this');
  });

  it('shows a loading hint when interests exist but no topic has arrived yet', () => {
    const html = renderToStaticMarkup(<TodaysTopicCard hasInterests />);
    expect(html).toContain('Finding a topic');
    expect(html).not.toContain('Pick your interests');
  });
});
