export function SessionAudioPlayer({ audioPath }: { audioPath?: string | null }): React.ReactElement {
  if (!audioPath) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/40 p-6 text-sm text-muted-foreground">
        No recording was captured for this session.
      </div>
    );
  }
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-e1">
      <h2 className="text-sm font-medium text-foreground">Session recording</h2>
      <p className="mt-1 text-xs text-muted-foreground">Replay exactly what you said, start to finish.</p>
      {/* Phase 7 seam: expose a ref/seek here for tap-a-finding -> jump-to-mm:ss. */}
      <audio className="mt-4 w-full" controls preload="metadata">
        <source src={audioPath} type="audio/webm" />
      </audio>
    </section>
  );
}
