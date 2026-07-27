'use client';

import { useState } from 'react';
import { Calendar, Clock, Sparkles, Upload, FileText, CheckCircle2, Loader2, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { createGoogleCalendarUrl } from './calendar-links';
import { toast } from 'sonner';

export interface ScheduledPracticeItem {
  id: string;
  title: string;
  targetDate: string; // ISO string
  durationMinutes: number;
  sourceName: string;
  roomUrl: string;
  googleCalendarUrl: string;
}

export function ScheduleModal({
  isOpen,
  onClose,
  onScheduled,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScheduled?: (item: ScheduledPracticeItem) => void;
}) {
  const [title, setTitle] = useState('');
  const [targetDateStr, setTargetDateStr] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(16, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState<number>(30);
  const [materialType, setMaterialType] = useState<'topic' | 'deck' | 'later'>('topic');
  const [topic, setTopic] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduledItem, setScheduledItem] = useState<ScheduledPracticeItem | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sessionTitle = title.trim() || (materialType === 'deck' && file ? file.name : topic.trim() || 'Presentation Defense');
    setLoading(true);

    try {
      let sessionId = '';
      let sourceName = 'General Presentation';

      if (materialType === 'deck' && file) {
        sourceName = file.name;
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await authenticatedFetch('/api/upload-presentation', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to process presentation file.');
        }

        const uploadData = await uploadRes.json();
        const createRes = await authenticatedFetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sessionTitle,
            mode: 'uninterrupted',
            stance: 'rigorous',
            deck: uploadData.deck,
          }),
        });
        const createData = await createRes.json();
        sessionId = createData.session.id;
      } else if (materialType === 'topic' && topic.trim()) {
        sourceName = topic.trim();
        const createRes = await authenticatedFetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sessionTitle,
            mode: 'uninterrupted',
            stance: 'rigorous',
            topic: topic.trim(),
            source: 'topic',
          }),
        });
        const createData = await createRes.json();
        sessionId = createData.session.id;
      } else {
        // Topic placeholder session
        sourceName = 'Topic rehearsal';
        const createRes = await authenticatedFetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sessionTitle,
            mode: 'uninterrupted',
            stance: 'rigorous',
            topic: sessionTitle,
            source: 'topic',
          }),
        });
        const createData = await createRes.json();
        sessionId = createData.session.id;
      }

      const startDate = new Date(targetDateStr);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sparring-partner.ai';
      const roomUrl = `${origin}/rehearse/${sessionId}`;
      const googleCalUrl = createGoogleCalendarUrl({
        title: sessionTitle,
        startDate,
        durationMinutes: duration,
        roomUrl,
        sourceName,
      });

      const item: ScheduledPracticeItem = {
        id: sessionId,
        title: sessionTitle,
        targetDate: startDate.toISOString(),
        durationMinutes: duration,
        sourceName,
        roomUrl,
        googleCalendarUrl: googleCalUrl,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('upcoming_rehearsal', JSON.stringify(item));
      }

      setScheduledItem(item);
      onScheduled?.(item);
      toast.success('Practice session scheduled!');
    } catch (err: any) {
      console.error('Schedule error:', err);
      toast.error(err.message || 'Unable to schedule session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-e3">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {!scheduledItem ? (
          <form onSubmit={handleScheduleSubmit} className="space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                <Calendar className="size-4" /> Practice Reminder
              </div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Schedule a Rehearsal</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Set a target date for your defense or presentation. We&apos;ll prepare your slides and generate a 1-click Google Calendar invite with your live room link!
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sched-title">Session Title</Label>
                <Input
                  id="sched-title"
                  placeholder="e.g. Final Thesis Defense, Investor Pitch Run"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sched-date">Date & Time</Label>
                  <Input
                    id="sched-date"
                    type="datetime-local"
                    value={targetDateStr}
                    onChange={(e) => setTargetDateStr(e.target.value)}
                    className="h-9 text-sm font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration</Label>
                  <div className="flex gap-1.5 pt-0.5">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDuration(mins)}
                        className={cn(
                          'flex-1 rounded-md border text-xs font-medium py-1.5 transition-colors',
                          duration === mins
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-border bg-surface text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Material Selection */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label>Attach Material (Optional)</Label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'topic', label: 'Topic Prompt', icon: FileText },
                    { id: 'deck', label: 'Upload Deck', icon: Upload },
                    { id: 'later', label: 'Attach Later', icon: Clock },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMaterialType(id as any)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all text-center',
                        materialType === id
                          ? 'border-primary bg-primary/10 text-primary font-semibold shadow-sm'
                          : 'border-border bg-surface text-muted-foreground hover:bg-popover',
                      )}
                    >
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {materialType === 'topic' && (
                  <Input
                    placeholder="e.g. AI ethics in healthcare, Quantum computing pitch"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="h-9 text-sm mt-2"
                  />
                )}

                {materialType === 'deck' && (
                  <div className="mt-2 space-y-1">
                    <Input
                      type="file"
                      accept=".pptx,.ppt,.pdf"
                      onChange={handleFileChange}
                      className="h-9 text-xs cursor-pointer"
                    />
                    {file && <p className="text-[11px] text-emerald-500 font-medium truncate">Selected: {file.name}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="w-1/3">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="w-2/3">
                {loading ? (
                  <><Loader2 className="size-4 animate-spin mr-2" />Processing...</>
                ) : (
                  <><Sparkles className="size-4 mr-1.5" />Generate Schedule</>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Step 3: Success & Google Calendar Export */
          <div className="space-y-6 text-center py-2">
            <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 className="size-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight">Rehearsal Scheduled!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Your practice room is set up. Add it to your Google Calendar so you get a reminder with your direct room URL when it&apos;s time to speak.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center text-muted-foreground font-mono text-[11px]">
                <span>Scheduled Target</span>
                <span>{new Date(scheduledItem.targetDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <p className="font-semibold text-sm text-foreground">{scheduledItem.title}</p>
              <p className="text-muted-foreground text-[11px]">Material: {scheduledItem.sourceName}</p>
            </div>

            <div className="space-y-3">
              <a
                href={scheduledItem.googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-500 transition-colors"
              >
                <Calendar className="size-4" /> Add to Google Calendar <ExternalLink className="size-3.5 opacity-80" />
              </a>

              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = scheduledItem.roomUrl;
                }}
                className="w-full text-xs"
              >
                Enter Rehearsal Room Now
              </Button>

              <button
                type="button"
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground underline pt-1 block mx-auto"
              >
                Done & Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
