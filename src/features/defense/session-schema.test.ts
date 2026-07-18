import { describe, expect, it } from 'vitest';

import { createDefenseSessionSchema } from './session-schema';

describe('createDefenseSessionSchema', () => {
  it('requires at least one grounded slide', () => {
    expect(() =>
      createDefenseSessionSchema.parse({
        title: 'Thesis',
        mode: 'mock',
        deck: { sourceName: 'x.pptx', slides: [] },
      }),
    ).toThrow(/slide/i);
  });
});
