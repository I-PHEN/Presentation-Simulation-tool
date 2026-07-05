'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, Loader2, Check, ChevronRight, Monitor, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore, type InputMode } from '@/lib/store';
import { toast } from 'sonner';

export default function UploadSection() {
  const {
    title, setTitle, content, setContent, hasContent, setHasContent,
    slides, setSlides, setStep, inputMode, setInputMode,
  } = useAppStore();

  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent browser from natively opening dropped PDFs globally
  useEffect(() => {
    const handleGlobalDrag = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', handleGlobalDrag);
    window.addEventListener('drop', handleGlobalDrag);
    return () => {
      window.removeEventListener('dragover', handleGlobalDrag);
      window.removeEventListener('drop', handleGlobalDrag);
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pptx', 'ppt', 'pdf', 'txt', 'md'].includes(ext)) {
      toast.error('Unsupported file. Use .pptx, .pdf, .txt, or .md');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-presentation', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();

      // Batch all store updates — React 18 auto-batches these inside async handlers
      // but we call setSlides last so slide thumbnails render after content is ready
      if (data.text) setContent(data.text);
      setHasContent(!!data.text);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
      // Defer slide list update slightly so the main thread stays responsive
      if (data.slides?.length > 0) {
        setTimeout(() => setSlides(data.slides), 50);
      }
      toast.success(`${data.totalSlides || 0} slides loaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualContent = () => {
    if (content.trim()) {
      setHasContent(true);
      toast.success('Content saved');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const canProceed = title.trim().length > 0;

  const inputModes: { key: InputMode; label: string; desc: string; icon: typeof Upload }[] = [
    { key: 'upload', label: 'Upload Slides', desc: 'PPTX, PDF, or text', icon: Upload },
    { key: 'screen', label: 'Share Screen', desc: 'Demo or live walkthrough', icon: Monitor },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center py-8 px-5">
          <div className="w-full max-w-xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Set up your session
            </h1>
            <p className="text-base text-muted-foreground">
              Choose how you want to present.
            </p>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6"
          >
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Presentation title
            </label>
            <Input
              placeholder="e.g., Q4 Product Launch Pitch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              className="h-10 text-sm bg-[#111113] border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30 rounded-lg"
            />
          </motion.div>

          {/* Input Mode Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <label className="text-sm text-foreground font-semibold mb-3 block">
              Presentation source
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {inputModes.map((mode) => {
                const active = inputMode === mode.key;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.key}
                    onClick={() => setInputMode(mode.key)}
                    className={`flex items-start gap-4 p-4 rounded-xl border text-left ${
                      active
                        ? 'bg-primary/5 border-primary/50 ring-1 ring-primary/50 shadow-md'
                        : 'border-border/50 bg-[#111113]'
                    }`}
                  >
                    <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-primary/20' : 'bg-muted/50'
                    }`}>
                      <Icon className={`size-5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold mb-1 ${active ? 'text-foreground' : 'text-foreground/80'}`}>
                        {mode.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{mode.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Upload Area (when upload mode) */}
          {inputMode === 'upload' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-5"
            >
              <div
                className={`border border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer hover:bg-muted/20 ${
                  dragActive
                    ? 'border-foreground/40 bg-muted/30'
                    : hasContent
                    ? 'border-success/20 bg-success/5'
                    : 'border-border hover:border-border hover:bg-muted/30'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pptx,.ppt,.pdf,.txt,.md"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 py-3">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Processing slides...</span>
                  </div>
                ) : hasContent ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Check className="size-4 text-success" />
                    <span className="text-sm text-foreground">
                      {slides.length > 0 ? `${slides.length} slides loaded` : 'Content saved'}
                    </span>
                    <span className="text-xs text-muted-foreground">— click to replace</span>
                  </div>
                ) : (
                  <div className="py-3">
                    <p className="text-sm text-muted-foreground">Drop your file or click to browse</p>
                    <p className="text-[11px] text-muted-foreground mt-1">.pptx · .pdf · .txt · .md</p>
                  </div>
                )}
              </div>

              {/* Slide thumbnails */}
              {slides.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] text-muted-foreground mb-1.5">{slides.length} slides</p>
                  <div className="grid grid-cols-5 gap-1">
                    {slides.length <= 5 ? (
                      slides.map((url, i) => (
                        <div key={i} className="rounded border border-border overflow-hidden aspect-[16/10] bg-muted">
                          <img src={url} alt={`Slide ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover object-top" />
                        </div>
                      ))
                    ) : (
                      <>
                        {slides.slice(0, 4).map((url, i) => (
                          <div key={i} className="rounded border border-border overflow-hidden aspect-[16/10] bg-muted">
                            <img src={url} alt={`Slide ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover object-top" />
                          </div>
                        ))}
                        <div className="rounded border border-border flex flex-col items-center justify-center bg-muted aspect-[16/10]">
                          <span className="text-xs font-semibold text-foreground">+{slides.length - 4}</span>
                          <span className="text-[9px] text-muted-foreground">more</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Manual paste */}
              {!hasContent && (
                <div className="mt-3">
                  <button
                    onClick={() => setManualOpen(!manualOpen)}
                    className="text-[11px] text-muted-foreground hover:text-muted-foreground transition-colors flex items-center gap-1"
                  >
                    <FileText className="size-3" />
                    {manualOpen ? 'Hide' : 'Paste content manually'}
                  </button>
                  {manualOpen && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        placeholder="Paste your script or outline..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[80px] resize-y text-xs bg-[#111113] border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30 rounded-lg"
                      />
                      {content.trim() && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg h-7"
                          onClick={handleManualContent}
                        >
                          <Check className="size-3 mr-1" />Use this content
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Screen Share Info (when screen mode) */}
          {inputMode === 'screen' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-5"
            >
              <div className="rounded-lg border border-border bg-[#111113] p-4">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-md bg-chart-2/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Monitor className="size-4 text-chart-2" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-foreground font-medium">Screen sharing mode</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      When you start presenting, you&apos;ll share your screen. The AI audience will see what&apos;s on screen and ask contextual questions — perfect for app demos, live walkthroughs, or any visual presentation.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">Product demos</span>
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">Code walkthroughs</span>
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">Dashboard reviews</span>
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">Live app tours</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
            </div>
          </div>
        </div>


      {/* Bottom bar */}
      <div className="shrink-0 border-t border-border bg-[#0a0a0c] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">
            {!canProceed ? 'Enter a title to continue' : `Step 1 of 5`}
          </p>
          <Button
            size="lg"
            className="px-8 bg-primary text-primary-foreground font-bold disabled:opacity-40"
            onClick={() => setStep(2)}
            disabled={!canProceed}
          >
            Continue
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
