import type { SpeakerProfileData } from '@/features/coaching/speaker-profile';

export function NextFocusCard({ profile }: { profile: SpeakerProfileData }) {
  const top = profile.recurringWeaknesses[0];
  const hasFocus = profile.nextFocus.trim().length > 0;
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <p className="text-xs font-medium text-muted-foreground">Work on this next</p>
      {hasFocus ? (
        <>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-medium tracking-tight">{profile.nextFocus}</h2>
          {top ? <p className="mt-2 text-sm text-muted-foreground">Seen in {top.count} of your {profile.totalSessions} sessions. Target it in your next rehearsal.</p> : null}
        </>
      ) : (
        <h2 className="mt-1 font-display text-2xl sm:text-3xl font-medium tracking-tight">Run your first rehearsal to start building your coach profile</h2>
      )}
    </section>
  );
}
