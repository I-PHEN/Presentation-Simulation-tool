import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DimensionSparkline } from './dimension-sparkline';
import { ProgressWorkspace } from './progress-workspace';

const model = {
  totalSessions: 3,
  nextFocus: 'Rushing closings',
  series: [{ dimension: 'fluency', points: [{ label: 'Jul 20', value: 60 }, { label: 'Jul 23', value: 84 }], delta: 'up' as const }],
  recurringWeaknesses: [{ label: 'Rushing closings', count: 3, lastSeen: '2026-07-23T00:00:00.000Z' }],
  history: [{ id: 'c', title: 'Third', date: 'Jul 23', href: '/reports/c' }],
};

describe('DimensionSparkline', () => {
  it('renders an accessible svg trend with a delta and current value', () => {
    const html = renderToStaticMarkup(<DimensionSparkline dimension="fluency" points={model.series[0].points} delta="up" />);
    expect(html).toContain('<svg');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label');
    expect(html).toContain('84'); // current value
  });

  it('renders a single-point series as New rather than a line', () => {
    const html = renderToStaticMarkup(<DimensionSparkline dimension="pace" points={[{ label: 'Jul 23', value: 90 }]} delta="steady" />);
    expect(html).toContain('New');
  });
});

describe('ProgressWorkspace', () => {
  it('renders header, growth, recurring weaknesses, and history', () => {
    const html = renderToStaticMarkup(<ProgressWorkspace model={model} />);
    expect(html).toContain('Progress');
    expect(html).toContain('Rushing closings');
    expect(html).toContain('fluency');
    expect(html).toContain('href="/reports/c"');
    expect(html).toContain('Third');
  });

  it('renders an empty state when there is no history', () => {
    const html = renderToStaticMarkup(<ProgressWorkspace model={{ totalSessions: 0, nextFocus: '', series: [], recurringWeaknesses: [], history: [] }} />);
    expect(html).toContain('No rehearsals');
  });
});
