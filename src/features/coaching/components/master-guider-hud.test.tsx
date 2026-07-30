import { describe, expect, it } from 'vitest';
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

  it('correctly categorizes WPM speech pacing ranges', () => {
    // Range 1: 130-150 WPM (Optimal Cadence)
    const htmlOptimal = renderToString(
      <MasterGuiderHud
        currentSlide={0}
        totalSlides={1}
        wpm={140}
        transcript=""
        onCoachRescue={() => {}}
      />
    );
    expect(htmlOptimal).toContain('Optimal Cadence (130-150 WPM)');
    expect(htmlOptimal).toContain('140 WPM');

    // Range 2: < 130 WPM (Deliberate Pace)
    const htmlDeliberate = renderToString(
      <MasterGuiderHud
        currentSlide={0}
        totalSlides={1}
        wpm={115}
        transcript=""
        onCoachRescue={() => {}}
      />
    );
    expect(htmlDeliberate).toContain('Deliberate Pace (&lt;130 WPM)');
    expect(htmlDeliberate).toContain('115 WPM');

    // Range 3: > 150 WPM (Fast Pace)
    const htmlFast = renderToString(
      <MasterGuiderHud
        currentSlide={0}
        totalSlides={1}
        wpm={175}
        transcript=""
        onCoachRescue={() => {}}
      />
    );
    expect(htmlFast).toContain('Fast Pace (&gt;150 WPM)');
    expect(htmlFast).toContain('175 WPM');
  });
});
