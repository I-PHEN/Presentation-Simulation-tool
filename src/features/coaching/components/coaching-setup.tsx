'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GraduationCap, Upload, Loader2, ChevronRight, FileText, Layers, Check
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore, PROMPT_TEMPLATE_CHIPS } from '@/lib/store';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { toast } from 'sonner';
import type { DeckContext } from '@/features/defense/types';
import { parseUploadedDeck } from '@/features/defense/components/deck-intake';

const ACCEPT = '.pptx,.ppt,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf';

export function CoachingSetup() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    coachPersona, setCoachPersona,
    presenterDirectives, setPresenterDirectives,
    explanationDepth, setExplanationDepth,
    setPracticeMode,
  } = useAppStore();

  const [deck, setDeck] = useState<DeckContext | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [sourceType, setSourceType] = useState<'deck' | 'topic'>('deck');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authenticatedFetch('/api/upload-presentation', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const parsed = parseUploadedDeck(data);
      if (parsed) {
        setDeck(parsed);
        if (!title) setTitle(parsed.sourceName.replace(/\.[^/.]+$/, ''));
        toast.success(`Deck loaded (${parsed.slides.length} slides)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload deck');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartCoaching = async () => {
    setIsCreating(true);
    try {
      setPracticeMode('guided');

      const payload = {
        title: title || (sourceType === 'deck' ? deck?.sourceName || 'Presentation Coaching' : topic || 'Topic Coaching'),
        mode: 'guided',
        stance: 'supportive',
        deck: sourceType === 'deck' ? deck : undefined,
        topic: sourceType === 'topic' ? topic : undefined,
        customConfig: {
          coachPersona,
          presenterDirectives,
          explanationDepth,
        },
      };

      const res = await authenticatedFetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.sessionId) throw new Error(data.error || 'Failed to create session');

      router.push(`/coaching/${data.sessionId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to launch coaching session');
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">01. Setup</p>
        <h1 className="font-display text-2xl font-medium tracking-tight sm:text-3xl text-foreground mt-1">
          Delivery & Voice Coaching
        </h1>
        <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
          Practice slide-by-slide with a personal AI presentation coach. Get real-time pacing telemetry, vocal weight guidance, and live talking point teleprompters.
        </p>
      </div>

      {/* Main Form Cards */}
      <div className="space-y-6">
        {/* Card 1: Material Intake */}
        <section aria-labelledby="coaching-step-material" className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs text-muted-foreground">01</span>
              <h2 id="coaching-step-material" className="text-base font-medium text-foreground">Select presentation material</h2>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setSourceType('deck')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  sourceType === 'deck' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Slide Deck
              </button>
              <button
                type="button"
                onClick={() => setSourceType('topic')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  sourceType === 'topic' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Topic Prompt
              </button>
            </div>
          </div>

          <div className="mt-4">
            {sourceType === 'deck' ? (
              <div>
                {!deck ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center bg-surface hover:bg-muted/30 transition-colors cursor-pointer space-y-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT}
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    {isProcessing ? (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <Loader2 className="size-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Parsing slides...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="size-6 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium text-foreground">Upload presentation deck (.pptx, .pdf)</p>
                        <p className="text-xs text-muted-foreground">Extracts slide visuals and structure automatically</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{deck.sourceName}</p>
                      <p className="text-xs text-muted-foreground">{deck.slides.length} slides ready</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setDeck(null)}>
                      Replace deck
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Q3 Executive Update, Thesis Defense, Product Pitch..."
                className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            )}
          </div>
        </section>

        {/* Card 2: Coach Selection */}
        <section aria-labelledby="coaching-step-coach" className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-muted-foreground">02</span>
            <h2 id="coaching-step-coach" className="text-base font-medium text-foreground">Select presentation coach</h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCoachPersona('marcus')}
              className={cn(
                'rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-muted/40',
                coachPersona === 'marcus' && 'border-primary bg-accent ring-1 ring-primary'
              )}
            >
              <p className="text-sm font-medium text-foreground">Coach Marcus (Male)</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Executive Delivery Specialist — Polished, authoritative executive coach voice.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setCoachPersona('sarah')}
              className={cn(
                'rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:bg-muted/40',
                coachPersona === 'sarah' && 'border-primary bg-accent ring-1 ring-primary'
              )}
            >
              <p className="text-sm font-medium text-foreground">Coach Sarah (Female)</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Presentation Strategist — Warm, encouraging master communication strategist.
              </p>
            </button>
          </div>
        </section>

        {/* Card 3: Presenter Focus Directives */}
        <section aria-labelledby="coaching-step-focus" className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-muted-foreground">03</span>
            <h2 id="coaching-step-focus" className="text-base font-medium text-foreground">Presenter focus & custom prompt</h2>
          </div>
          <p className="text-xs text-muted-foreground">Specify custom goals or pick a quick template chip to focus your coach.</p>

          <div className="flex flex-wrap gap-2">
            {PROMPT_TEMPLATE_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPresenterDirectives(chip.text)}
                className="px-3 py-1 rounded-md border border-border bg-surface text-xs text-foreground hover:bg-muted transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <textarea
            value={presenterDirectives}
            onChange={(e) => setPresenterDirectives(e.target.value)}
            className="w-full min-h-[85px] rounded-lg border border-border bg-surface p-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary leading-relaxed placeholder:text-muted-foreground"
            placeholder="e.g., Help me sound calm and authoritative. Emphasize key data metrics clearly without rushing..."
          />
        </section>

        {/* Card 4: Explanation Depth Focus */}
        <section aria-labelledby="coaching-step-depth" className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-xs text-muted-foreground">04</span>
            <h2 id="coaching-step-depth" className="text-base font-medium text-foreground">Explanation depth focus</h2>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { id: 'surface', label: 'Overview', desc: 'High-level summary' },
              { id: 'balanced', label: 'Balanced', desc: 'Executive focus' },
              { id: 'deep', label: 'Technical', desc: 'Detailed breakdown' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setExplanationDepth(item.id as any)}
                className={cn(
                  'rounded-lg border border-border bg-surface p-3 text-center transition-colors hover:bg-muted/40',
                  explanationDepth === item.id && 'border-primary bg-accent ring-1 ring-primary'
                )}
              >
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{item.desc}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Start Button */}
      <div className="pt-2">
        <Button
          size="lg"
          onClick={handleStartCoaching}
          disabled={isCreating || (sourceType === 'deck' && !deck) || (sourceType === 'topic' && !topic.trim())}
          className="w-fit min-w-[200px]"
        >
          {isCreating ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" /> Creating session...
            </>
          ) : (
            <>
              Start coaching <ChevronRight className="size-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
