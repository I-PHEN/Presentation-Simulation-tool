/**
 * Formats a Date object into Google Calendar ISO string format (YYYYMMDDTHHMMSSZ).
 */
export function formatGoogleCalendarDate(date: Date): string {
  return date
    .toISOString()
    .replace(/-|:|\.\d\d\d/g, '');
}

export interface GoogleCalendarEventParams {
  title: string;
  startDate: Date;
  durationMinutes: number;
  roomUrl: string;
  details?: string;
  sourceName?: string;
}

/**
 * Constructs a 1-click Google Calendar Event Template URL.
 */
export function createGoogleCalendarUrl({
  title,
  startDate,
  durationMinutes,
  roomUrl,
  details,
  sourceName,
}: GoogleCalendarEventParams): string {
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const dates = `${formatGoogleCalendarDate(startDate)}/${formatGoogleCalendarDate(endDate)}`;

  const eventTitle = `🎤 ${title.trim()} — Sparring Partner`;
  
  const descriptionLines = [
    `Time for your oral defense & presentation rehearsal!`,
    sourceName ? `Material: ${sourceName}` : undefined,
    ``,
    `🔗 Click here to enter your live rehearsal room:`,
    roomUrl,
    ``,
    details ? `Notes: ${details}` : undefined,
    `Powered by Sparring Partner AI Coach`,
  ].filter((line): line is string => line !== undefined);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle,
    dates,
    details: descriptionLines.join('\n'),
    location: roomUrl,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
