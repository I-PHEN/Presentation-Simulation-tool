import { describe, expect, it } from 'vitest';
import { DEFAULT_TOPICS, buildTopicsPrompt, parseTopicsResponse } from './topics';

describe('buildTopicsPrompt', () => {
  it('grounds the prompt in the supplied interests', () => {
    const prompt = buildTopicsPrompt(['Space', 'Ethics']);
    expect(prompt).toContain('Space, Ethics');
    expect(prompt).toContain('JSON array of strings');
  });

  it('falls back to a general framing when no interests are given', () => {
    expect(buildTopicsPrompt([])).toContain('general current affairs');
  });
});

describe('parseTopicsResponse', () => {
  it('parses a plain JSON array', () => {
    expect(parseTopicsResponse('["A", "B"]')).toEqual(['A', 'B']);
  });

  it('tolerates code fences', () => {
    expect(parseTopicsResponse('```json\n["A", "B"]\n```')).toEqual(['A', 'B']);
  });

  it('drops non-strings, blanks, over-long items, and duplicates, and caps the count', () => {
    const raw = JSON.stringify(['A', 1, '', '  A ', 'x'.repeat(200), 'B', 'C', 'D', 'E', 'F', 'G']);
    const out = parseTopicsResponse(raw);
    expect(out).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('returns an empty array on garbage', () => {
    expect(parseTopicsResponse('not json')).toEqual([]);
    expect(parseTopicsResponse('{"topics":[]}')).toEqual([]);
  });
});

describe('DEFAULT_TOPICS', () => {
  it('provides a usable non-empty fallback set', () => {
    expect(DEFAULT_TOPICS.length).toBeGreaterThanOrEqual(3);
  });
});
