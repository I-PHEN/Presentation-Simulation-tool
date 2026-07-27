'use client';

import { useEffect, useState } from 'react';
import type { DefenseMode, ExaminerStance } from '@/features/defense/types';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildTopicSessionPayload, chooseTopic, type TopicConfig } from './topic-session';

const MODES: ReadonlyArray<readonly [DefenseMode, string, string]> = [
  ['uninterrupted', 'Uninterrupted presentation', 'Present your whole topic at your own pace without mid-presentation interruptions.'],
  ['diagnostic', 'Diagnostic sparring', 'Pauses on weak reasoning so you can repair it before moving on.'],
  ['mock', 'Mock defense', 'Keeps the examination moving under realistic pressure, start to finish.'],
];

const STANCES: ReadonlyArray<readonly [ExaminerStance, string, string]> = [
  ['rigorous', 'Rigorous', 'Probes your assumptions and evidence hard.'],
  ['supportive', 'Supportive', 'Asks clear questions while still testing your understanding.'],
];

const RADIO_CARD =
  'cursor-pointer rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-popover has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-primary';

/** A topic arriving from elsewhere (Today's topic) has to survive the /api/topics
 * fetch, which would otherwise replace the list and orphan the selection. */
function withTopic(topics: string[], initialTopic: string): string[] {
  if (!initialTopic) return topics;
  return topics.includes(initialTopic) ? topics : [initialTopic, ...topics];
}

export function TopicSetup({
  creating = false,
  startError,
  onStart,
  topicsFetcher = authenticatedFetch,
  initialTopics = [],
  initialTopic = '',
}: {
  creating?: boolean;
  startError?: string;
  onStart: (config: TopicConfig) => void;
  topicsFetcher?: typeof fetch;
  initialTopics?: string[];
  /** Preselected topic, e.g. arriving from Home's Today's topic card. */
  initialTopic?: string;
}): React.ReactElement {
  const [topics, setTopics] = useState<string[]>(() => withTopic(initialTopics, initialTopic));
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(initialTopic);
  const [custom, setCustom] = useState('');
  const [mode, setMode] = useState<DefenseMode>('diagnostic');
  const [stance, setStance] = useState<ExaminerStance>('rigorous');

  const loadTopics = async () => {
    setLoading(true);
    try {
      const response = await topicsFetcher('/api/topics', { method: 'POST' });
      const data = await response.json();
      if (Array.isArray(data.topics)) setTopics(withTopic(data.topics.filter((topic: unknown): topic is string => typeof topic === 'string'), initialTopic));
    } catch {
      /* the route already falls back to defaults; a network miss just leaves type-your-own */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTopics(); }, []);

  const topic = chooseTopic(selected, custom);
  const start = () => {
    if (!topic) return;
    onStart(buildTopicSessionPayload({ topic, mode, stance }));
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section aria-labelledby="topic-step-pick" className="rounded-xl border border-border bg-card p-6 shadow-e1 sm:p-8">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-muted-foreground">01</span>
            <h2 id="topic-step-pick" className="text-base font-medium">What will you speak to?</h2>
          </div>
          <button type="button" onClick={() => void loadTopics()} disabled={loading} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            {loading ? 'Refreshing...' : 'Refresh topics'}
          </button>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Pick a suggested topic tailored to your interests, or type your own.
        </p>

        {topics.length > 0 && (
          <fieldset className="mt-5">
            <legend className="sr-only">Recommended topics</legend>
            <div className="grid gap-3">
              {topics.map((option) => (
                <label key={option} className={cn(RADIO_CARD, selected === option && !custom.trim() && 'border-primary bg-accent shadow-e1')}>
                  <input type="radio" name="topic-choice" value={option} checked={selected === option} onChange={() => { setSelected(option); setCustom(''); }} className="sr-only" />
                  <span className="block text-sm font-medium">{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {topics.length === 0 && !loading && (
          <p className="mt-5 text-sm text-muted-foreground">No suggestions right now — type your own topic below.</p>
        )}

        <div className="mt-5">
          <label htmlFor="topic-custom" className="text-sm font-medium">Or type your own topic</label>
          <input
            id="topic-custom"
            type="text"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="e.g. Why cities should ban cars from downtown cores"
            className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
          />
        </div>
      </section>

      <section
        aria-labelledby="topic-step-room"
        className={cn('rounded-xl border border-border bg-card p-6 shadow-e1 transition-opacity sm:p-8', !topic && 'opacity-60')}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground">02</span>
          <h2 id="topic-step-room" className="text-base font-medium">Who is in the room?</h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Set how the examiner should challenge you. You can change this next time.</p>

        <fieldset className="mt-5" disabled={!topic}>
          <legend className="text-sm font-medium">Practice mode</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {MODES.map(([value, label, help]) => (
              <label key={value} className={cn(RADIO_CARD, mode === value && 'border-primary bg-accent shadow-e1')}>
                <input type="radio" name="topic-mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{help}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6" disabled={!topic}>
          <legend className="text-sm font-medium">Examiner stance</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {STANCES.map(([value, label, help]) => (
              <label key={value} className={cn(RADIO_CARD, stance === value && 'border-primary bg-accent shadow-e1')}>
                <input type="radio" name="topic-stance" value={value} checked={stance === value} onChange={() => setStance(value)} className="sr-only" />
                <span className="block text-sm font-medium">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{help}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {startError && <p role="alert" className="text-sm text-destructive">{startError}</p>}
      <button type="button" disabled={!topic || creating} onClick={start} className={cn(buttonVariants({ size: 'lg' }), 'w-full')}>
        {creating ? 'Starting rehearsal...' : 'Start rehearsal'}
      </button>
    </div>
  );
}
