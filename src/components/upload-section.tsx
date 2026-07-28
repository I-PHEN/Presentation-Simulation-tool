'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Upload, Loader2, Check, ChevronRight, Monitor, FileText, Briefcase, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore, type InputMode } from '@/lib/store';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

export default function UploadSection() {
  const {
    title, setTitle, content, setContent, hasContent, setHasContent,
    slides, setSlides, setStep, inputMode, setInputMode,
    practiceMode, setPracticeMode, targetRole, setTargetRole,
    targetCompany, setTargetCompany,
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

  // Update session title for interviews automatically
  useEffect(() => {
    if (practiceMode === 'interview') {
      setTitle(targetCompany || targetRole ? `${targetCompany} - ${targetRole} Interview` : '');
    }
  }, [targetCompany, targetRole, practiceMode, setTitle]);

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
      const res = await authenticatedFetch('/api/upload-presentation', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();

      if (data.text) setContent(data.text);
      setHasContent(!!data.text);
      
      if (practiceMode !== 'interview') {
        if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
        if (data.slides?.length > 0) {
          setTimeout(() => setSlides(data.slides), 50);
        }
        toast.success(`${data.totalSlides || 0} slides loaded`);
      } else {
        toast.success('CV/Resume loaded successfully');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualContent = () => {
    if (content.trim()) {
      setHasContent(true);
      toast.success(practiceMode === 'interview' ? 'CV/Resume saved' : 'Content saved');
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

  const isInterview = practiceMode === 'interview';
  const canProceed = isInterview 
    ? (targetRole.trim().length > 0 && targetCompany.trim().length > 0 && hasContent)
    : (title.trim().length > 0 && hasContent);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center py-8 px-5">
          <div className="w-full max-w-xl">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                Set up your session
              </h1>
              <p className="text-base text-muted-foreground">
                Choose what you want to practice today.
              </p>
            </motion.div>

            {/* Session Type (Presentation vs. Job Interview) */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-8"
            >
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">
                Session Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPracticeMode('full');
                    setInputMode('upload');
                    setSlides([]);
                    setContent('');
                    setHasContent(false);
                  }}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    !isInterview
                      ? 'bg-primary/5 border-primary/50 ring-1 ring-primary/50 shadow-md'
                      : 'border-border/50 bg-card hover:bg-muted/30'
                  }`}
                >
                  <Sparkles className={`size-5 mb-2 ${!isInterview ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-bold text-foreground">Present & Pitch Mode</span>
                  <span className="text-xs text-muted-foreground mt-1 font-medium leading-relaxed">Present slides, lectures, or pitches first, followed by Q&A</span>
                </button>

                <button
                  onClick={() => {
                    setPracticeMode('interview');
                    setInputMode('upload');
                    setSlides([]);
                    setContent('');
                    setHasContent(false);
                  }}
                  className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    isInterview
                      ? 'bg-primary/5 border-primary/50 ring-1 ring-primary/50 shadow-md'
                      : 'border-border/50 bg-card hover:bg-muted/30'
                  }`}
                >
                  <Briefcase className={`size-5 mb-2 ${isInterview ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-bold text-foreground">Direct Q&A Panel Mode</span>
                  <span className="text-xs text-muted-foreground mt-1 font-medium leading-relaxed">Mock interviews or grilling directly based on your CV/topic</span>
                </button>
              </div>
            </motion.div>

            {/* Title / Company & Role Fields */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 space-y-4"
            >
              {!isInterview ? (
                <div>
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
                    Presentation or Pitch Title
                  </label>
                  <Input
                    placeholder="e.g., Q4 Product Launch Pitch"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-10 text-sm bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30 rounded-lg"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
                      Target Context / Company
                    </label>
                    <Input
                      placeholder="e.g., Google, MIT, Hospital Board"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      className="h-10 text-sm bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5 block">
                      Target Role / Topic
                    </label>
                    <Input
                      placeholder="e.g., Software Engineer, PhD Candidate"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className="h-10 text-sm bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Upload Area */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-5"
            >
              <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2.5 block">
                {isInterview ? 'Upload CV or Resume (Required)' : 'Upload Slides'}
              </label>
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
                    <span className="text-sm text-muted-foreground">Processing document...</span>
                  </div>
                ) : hasContent ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Check className="size-4 text-success" />
                    <span className="text-sm text-foreground">
                      {isInterview ? 'CV/Resume loaded' : (slides.length > 0 ? `${slides.length} slides loaded` : 'Content saved')}
                    </span>
                    <span className="text-xs text-muted-foreground">— click to replace</span>
                  </div>
                ) : (
                  <div className="py-3">
                    <p className="text-sm text-muted-foreground">Drop your CV/resume or slides here, or click to browse</p>
                    <p className="text-[11px] text-muted-foreground mt-1">.pdf · .pptx · .txt · .md</p>
                  </div>
                )}
              </div>

              {/* Slide thumbnails (Presentations only) */}
              {!isInterview && slides.length > 0 && (
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
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <FileText className="size-3" />
                    {manualOpen ? 'Hide' : (isInterview ? 'Paste CV text manually' : 'Paste content manually')}
                  </button>
                  {manualOpen && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        placeholder={isInterview ? "Paste the text of your CV/Resume here..." : "Paste your script or outline..."}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[80px] resize-y text-xs bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30 rounded-lg"
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
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-border bg-card px-6 py-4">
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
