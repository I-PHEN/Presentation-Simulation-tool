import { describe, expect, it } from 'vitest';
import { buildTopicEvaluationPrompt } from './topic-evaluation';

describe('buildTopicEvaluationPrompt', () => {
  it('grounds the prompt in the topic and the transcript', () => {
    const prompt = buildTopicEvaluationPrompt({ topic: 'Should cities ban cars?', transcript: 'Cars cause congestion.' });
    expect(prompt).toContain('Should cities ban cars?');
    expect(prompt).toContain('Cars cause congestion.');
  });

  it('requires response_explanation and forbids slide reading', () => {
    const prompt = buildTopicEvaluationPrompt({ topic: 'X', transcript: 'Y' });
    expect(prompt).toContain('"basis": "response_explanation"');
    expect(prompt).toMatch(/slide_reliance is forbidden/i);
    expect(prompt).toMatch(/no slides/i);
  });

  it('notes when no transcript was captured', () => {
    expect(buildTopicEvaluationPrompt({ topic: 'X', transcript: '' })).toContain('No transcript was captured.');
  });
});
