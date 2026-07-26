import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TopicSetup } from './topic-setup';

describe('TopicSetup', () => {
  it('renders the topic step, the room conditions, and a disabled start until a topic is chosen', () => {
    const html = renderToStaticMarkup(<TopicSetup onStart={() => undefined} />);
    expect(html).toContain('What will you speak to?');
    expect(html).toContain('Or type your own topic');
    expect(html).toContain('Refresh topics');
    // Same room step as the deck path.
    expect(html).toContain('Diagnostic practice');
    expect(html).toContain('Mock defense');
    expect(html).toContain('Rigorous');
    expect(html).toContain('Supportive');
    expect(html.match(/name="topic-mode"/g)).toHaveLength(2);
    expect(html.match(/name="topic-stance"/g)).toHaveLength(2);
    // No deck-only chrome.
    expect(html).not.toContain('Presentation deck');
    expect(html).not.toContain('Upload');
    // Start disabled with no topic.
    expect(html).toMatch(/Start rehearsal<\/button>/);
    expect(html).toContain('disabled=""');
  });

  it('renders recommended topics as selectable cards when seeded', () => {
    const html = renderToStaticMarkup(
      <TopicSetup onStart={() => undefined} initialTopics={['Should AI be regulated?', 'Is remote work better?']} />,
    );
    expect(html).toContain('Should AI be regulated?');
    expect(html).toContain('Is remote work better?');
    expect(html.match(/name="topic-choice"/g)).toHaveLength(2);
  });

  it('preselects a topic handed in from elsewhere and enables Start straight away', () => {
    const html = renderToStaticMarkup(
      <TopicSetup onStart={() => undefined} initialTopic="Should AI be regulated?" />,
    );
    expect(html).toContain('Should AI be regulated?');
    expect(html).toMatch(/name="topic-choice"[^>]*checked=""/);
    // Nothing left to choose, so the start button is live on arrival.
    expect(html).not.toMatch(/disabled=""[^>]*>Start rehearsal/);
  });

  it('keeps the handed-in topic in the list even when the suggestions do not include it', () => {
    const html = renderToStaticMarkup(
      <TopicSetup onStart={() => undefined} initialTopics={['Is remote work better?']} initialTopic="Should AI be regulated?" />,
    );
    expect(html).toContain('Should AI be regulated?');
    expect(html).toContain('Is remote work better?');
    expect(html.match(/name="topic-choice"/g)).toHaveLength(2);
  });

  it('shows the creating label and the start error when provided', () => {
    const html = renderToStaticMarkup(
      <TopicSetup onStart={() => undefined} initialTopics={['A topic']} creating startError="The service is busy." />,
    );
    expect(html).toContain('Starting rehearsal...');
    expect(html).toContain('The service is busy.');
    expect(html).toContain('role="alert"');
  });
});
