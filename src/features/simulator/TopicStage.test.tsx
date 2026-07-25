import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TopicStage } from './TopicStage';

describe('TopicStage', () => {
  it('renders the topic as the hero and shows the angle prompts', () => {
    const html = renderToStaticMarkup(<TopicStage topic="Should cities ban cars downtown?" />);
    expect(html).toContain('Your topic');
    expect(html).toContain('Should cities ban cars downtown?');
    expect(html).toContain('State your claim in one sentence.');
    expect(html).toContain('Address the sharpest counter-argument.');
  });

  it('renders no slide image or slide navigation', () => {
    const html = renderToStaticMarkup(<TopicStage topic="A topic" />);
    expect(html).not.toContain('Previous slide');
    expect(html).not.toContain('Next slide');
    expect(html).not.toContain('<img');
  });
});
