export interface RecorderSink {
  start(): void;
  stop(): Promise<Blob>;
  release(): void;
}

export interface SessionRecorderDeps {
  acquire: () => Promise<RecorderSink>;
  upload: (blob: Blob) => Promise<void>;
  onError?: (message: string) => void;
}

const START_ERROR = 'Recording could not start. Your rehearsal is still being captured as text.';
const UPLOAD_ERROR = 'The recording could not be saved. Your report is still ready.';

export function createSessionRecorder(deps: SessionRecorderDeps) {
  let sink: RecorderSink | null = null;
  let recording = false;

  const start = async (): Promise<void> => {
    if (recording) return;
    try {
      sink = await deps.acquire();
      sink.start();
      recording = true;
    } catch {
      sink = null;
      recording = false;
      deps.onError?.(START_ERROR);
    }
  };

  const stop = async (): Promise<void> => {
    if (!recording || !sink) return;
    const active = sink;
    sink = null;
    recording = false;
    try {
      const blob = await active.stop();
      await deps.upload(blob);
    } catch {
      deps.onError?.(UPLOAD_ERROR);
    } finally {
      active.release();
    }
  };

  return { start, stop, isRecording: () => recording };
}
