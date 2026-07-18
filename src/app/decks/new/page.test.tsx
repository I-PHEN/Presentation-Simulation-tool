import { describe, expect, it } from 'vitest';
import { createDefenseSessionPayload } from './page';

describe('createDefenseSessionPayload', () => {
  it('uses the validated route-local deck when creating a diagnostic session', () => {
    const deck = { sourceName: 'Thesis.pdf', slides: [{ index: 1, text: 'Opening', imageUrl: '/slide-1.png' }] };
    expect(createDefenseSessionPayload(deck)).toEqual({
      title: 'Thesis.pdf', mode: 'diagnostic', stance: 'rigorous', deck,
    });
  });
});
