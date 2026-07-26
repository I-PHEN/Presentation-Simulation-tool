export function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** The Home header: a warm, personal greeting that sets a clear direction. */
export function Greeting({ name, hasActive }: { name?: string; hasActive: boolean }) {
  const greeting = greetingFor(new Date().getHours());
  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
        {greeting}{name ? `, ${name}` : ''}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasActive ? 'Pick up where you left off.' : 'Ready when you are — start a rehearsal below.'}
      </p>
    </div>
  );
}
