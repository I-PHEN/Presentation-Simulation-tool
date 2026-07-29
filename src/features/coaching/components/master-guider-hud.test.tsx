import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import MasterGuiderHud from './master-guider-hud';

describe('MasterGuiderHud', () => {
  it('renders coach persona, slide index, tempo status, and rescue action button', () => {
    const html = renderToString(
      <MasterGuiderHud
        currentSlide={1}
        totalSlides={5}
        wpm={140}
        transcript="Hello presentation"
        onCoachRescue={() => {}}
      />
    );
    expect(html).toContain('Coach Marcus');
    expect(html).toContain('2');
    expect(html).toContain('5');
    expect(html).toContain('140 WPM');
    expect(html).toContain('Coach Rescue');
  });
});
