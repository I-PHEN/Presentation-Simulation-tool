import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { CoachingTeleprompter } from './coaching-teleprompter';

describe('CoachingTeleprompter', () => {
  it('renders Hook + Context, Solution, Impact triad with fallback values', () => {
    const html = renderToString(
      <CoachingTeleprompter
        currentSlide={0}
        isLoading={false}
        isPlayingDemo={false}
        onPlayDemo={() => {}}
      />
    );

    // Header
    expect(html).toContain('Slide 1 Delivery Guide &amp; Talking Points');

    // Hook
    expect(html).toContain('Hook (0-15s):');
    expect(html).toContain('Capture attention immediately with your main takeaway.');

    // Triad talking points (Context, Solution, Impact)
    expect(html).toContain('Context: Establish the core bottleneck or problem immediately.');
    expect(html).toContain('Solution: Detail your strategic solution &amp; key evidence points.');
    expect(html).toContain('Impact: Conclude with a clear call to action and vision.');
  });

  it('renders custom script data when provided', () => {
    const customScript = {
      openingHook: 'Our algorithm reduces latency by 50%.',
      talkingPoints: [
        'Context: Current models suffer from O(N^2) bottlenecks.',
        'Solution: Parallel stream processing handles dynamic spikes.',
        'Impact: Reduces operational expenditures by 35%.',
      ],
      rescueScript: 'Fallback script text.',
    };

    const html = renderToString(
      <CoachingTeleprompter
        currentSlide={2}
        script={customScript}
        isLoading={false}
        isPlayingDemo={false}
        onPlayDemo={() => {}}
      />
    );

    expect(html).toContain('Slide 3 Delivery Guide &amp; Talking Points');
    expect(html).toContain('Our algorithm reduces latency by 50%.');
    expect(html).toContain('Context: Current models suffer from O(N^2) bottlenecks.');
    expect(html).toContain('Solution: Parallel stream processing handles dynamic spikes.');
    expect(html).toContain('Impact: Reduces operational expenditures by 35%.');
  });

  it('renders topic session title header and topic fallback hook', () => {
    const html = renderToString(
      <CoachingTeleprompter
        currentSlide={0}
        isLoading={false}
        isPlayingDemo={false}
        onPlayDemo={() => {}}
        isTopicSession={true}
      />
    );

    expect(html).toContain('Topic Delivery Guide &amp; Spoken Triad');
    expect(html).toContain('State your core thesis clearly with high conviction in the first 15 seconds.');
  });

  it('shows loading indicator when isLoading is true', () => {
    const html = renderToString(
      <CoachingTeleprompter
        currentSlide={0}
        isLoading={true}
        isPlayingDemo={false}
        onPlayDemo={() => {}}
      />
    );

    expect(html).toContain('Generating speech guidance...');
  });

  it('reflects demo playing state in button', () => {
    const html = renderToString(
      <CoachingTeleprompter
        currentSlide={0}
        isLoading={false}
        isPlayingDemo={true}
        onPlayDemo={() => {}}
      />
    );

    expect(html).toContain('Speaking...');
  });
});
