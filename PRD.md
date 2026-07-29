# Product Requirements Document (PRD)

## Project Name: SharkPit
**Executive Presentation Defense & Masterclass AI Delivery Studio**

---

## 1. Executive Summary & Vision

**SharkPit** is an AI-powered, voice-first application designed to help presenters practice, refine, and master high-stakes presentation delivery. 

Presenters face two fundamental challenges:
1. **Unpolished Spoken Delivery**: Struggling with speech pacing, tone emphasis, and talking point flow on specific slides without real-time telemetry.
2. **Q&A Anxiety & Reasoning Breaches**: Falling apart under high-pressure, adversarial questioning from investors, board members, or academic examiners.

SharkPit solves both problems through a **Dual-Engine Architecture**:
- **Masterclass Delivery Studio (`/coaching`)**: A 1-on-1 coaching environment where an AI speechwriter auto-generates talking point scripts, provides voiceover demonstrations via TTS, and tracks real-time WPM pacing and explanation depth.
- **Adversarial Panel Sparring (`/rehearse`)**: A realistic Q&A defense simulator where AI examiner personas (Investor, Executive, Professor, Hackathon Judge, Recruiter) challenge assumptions mid-slide.

---

## 2. Target User Personas

| Persona | Primary Goal | Core Pain Point | Primary Mode Used |
| :--- | :--- | :--- | :--- |
| **Startup Founder** | Pitch VCs for Seed / Series A funding | Stumbling over unit economics & financial ROI | Masterclass Studio (`/coaching`) & Investor Sparring |
| **Academic Researcher** | Defend PhD / Master's thesis | Over-explaining methodology or failing under hostile questioning | Academic Defense Sparring (`/rehearse`) |
| **Executive / VP** | Deliver quarterly board update | Rushing through dense slides without crisp spoken hooks | Executive Masterclass (`/coaching`) |
| **Job Applicant** | Pass STAR behavioral interview | Struggling to articulate concise structured answers | STAR Behavioral Prompting (`/coaching`) |

---

## 3. Functional Requirements

### FR-1: Presentation Deck & Material Intake (`/decks/new` & `/coaching/new`)
- **FR-1.1**: Support PowerPoint (`.pptx`, `.ppt`) and PDF (`.pdf`) document uploads.
- **FR-1.2**: Extract slide layout graphics, text evidence, typography, and shape positioning using an OpenXML SVG engine.
- **FR-1.3**: Support custom topic prompts as an alternative for text-only impromptu practice.
- **FR-1.4**: Provide drag-and-drop file dropzone with format badges, progress feedback, and slide thumbnail carousel preview.

### FR-2: Masterclass Delivery & AI Script Teleprompter (`/coaching`)
- **FR-2.1**: Call backend AI endpoint (`/api/coaching/script`) to generate an **Opening Hook**, **3 Spoken Talking Points**, and a **15-Second Rescue Script** for every slide.
- **FR-2.2**: Allow users to select AI Coach Persona: **Coach Marcus** (*Executive Delivery Specialist - Male*) vs **Coach Sarah** (*Presentation Strategist - Female*).
- **FR-2.3**: Enable **Demonstrate Delivery** TTS voiceovers so users can hear Coach Marcus or Coach Sarah read optimal slide scripts aloud.
- **FR-2.4**: Provide explanation depth focus toggles (`Overview`, `Balanced`, `Technical`).

### FR-3: Adversarial AI Examiner Panel Engine (`/rehearse`)
- **FR-3.1**: Support practice modes (`Uninterrupted`, `Diagnostic Sparring`, `Mock Defense`).
- **FR-3.2**: Support examiner stances (`Rigorous` vs `Supportive`).
- **FR-3.3**: Simulate 5 distinct audience personas with custom voices: Investor, Executive, Professor, Hackathon Judge, Recruiter.
- **FR-3.4**: Trigger mid-slide vocal Q&A interruptions when weak evidence or flawed reasoning is detected.

### FR-4: Real-time Speech Telemetry & Audio Pipeline
- **FR-4.1**: Measure live Words-Per-Minute (WPM) tempo and classify pace status (`Optimal`, `Slowing Down`, `Rushing`).
- **FR-4.2**: Integrate low-latency Text-to-Speech (TTS) via Cartesia API.
- **FR-4.3**: Integrate Speech-to-Text (ASR) via Web Speech API and Whisper backends.

### FR-5: Multi-Agent Performance Evaluation (`/reports`)
- **FR-5.1**: Evaluate completed sessions across 7 quantitative dimensions: Clarity, Confidence, Technical Rigor, Storytelling, Persuasiveness, Conciseness, and Verbatim Reading Detection.
- **FR-5.2**: Provide transcript timeline, interruption breakdown, and personalized actionable recommendation cards.

### FR-6: Design System & UX Standards
- **FR-6.1**: Maintain strict theme integrity across Light/Dark modes with zero React hydration mismatch.
- **FR-6.2**: Adhere to clean, executive Shadcn UI styling (`bg-card`, `border-border`, crisp typography, Lucide iconography).

---

## 4. Technical Architecture & Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, Shadcn UI, Framer Motion, Zustand.
- **Backend & APIs**: Next.js API Routes (`/api/coaching/script`, `/api/session`, `/api/tts`, `/api/upload-presentation`).
- **Database**: SQLite (via Prisma ORM).
- **Voice & LLM Engines**: Cartesia AI (TTS), Web Speech API (ASR), ZAI GLM-4 / Groq LLM.
- **Testing**: Vitest (100% test coverage with 439+ passing unit tests).

---

## 5. Success Metrics & Quality Benchmarks

| Metric | Target Benchmark | Verification Method |
| :--- | :--- | :--- |
| **Unit Test Coverage** | 100% Passing Test Suites | `npx vitest run` |
| **Production Build** | 0 TypeScript / Turbopack Compilation Errors | `npm run build` |
| **TTS Voice Latency** | < 350 ms response time | Cartesia Websocket / HTTP pipeline |
| **Hydration Integrity** | 0 React hydration mismatch warnings | Next.js SSR validation |

---

<div align="center">
Document Version: 2.0 • Status: Approved for Production
</div>
