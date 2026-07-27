import { describe, expect, it } from 'vitest';
import { createGoogleCalendarUrl, formatGoogleCalendarDate } from './calendar-links';

describe('calendar-links', () => {
  it('formats dates in ISO UTC format without separators', () => {
    const date = new Date('2026-07-28T16:00:00.000Z');
    expect(formatGoogleCalendarDate(date)).toBe('20260728T160000Z');
  });

  it('generates a valid 1-click Google Calendar URL', () => {
    const url = createGoogleCalendarUrl({
      title: 'Thesis Defense',
      startDate: new Date('2026-07-28T16:00:00.000Z'),
      durationMinutes: 30,
      roomUrl: 'https://sparring-partner.ai/rehearse/session-123',
      sourceName: 'Thesis.pptx',
    });

    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=%F0%9F%8E%A4+Thesis+Defense+%E2%80%94+Sparring+Partner');
    expect(url).toContain('dates=20260728T160000Z%2F20260728T163000Z');
    expect(url).toContain('https%3A%2F%2Fsparring-partner.ai%2Frehearse%2Fsession-123');
  });
});
