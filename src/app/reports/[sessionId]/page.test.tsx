import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('report page audio replay wiring', () => {
  it('reads audioPath from the session and renders the player', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/reports/[sessionId]/page.tsx'), 'utf8');
    expect(source).toContain('SessionAudioPlayer');
    expect(source).toContain('audioPath');
  });
});
