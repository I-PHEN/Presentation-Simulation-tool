# Presentation Sparring Partner

An immersive, voice-first AI-powered application designed to help presenters practice their pitches, lectures, and product demos. Get real-time voice feedback, practice under different audience persona scenarios, and review multi-agent evaluation analytics.

---

## 🚀 Key Features

* **Voice-First Practice**: Real-time voice interaction. The AI judges speak via Cartesia Text-to-Speech (TTS), and the presenter responds naturally using Speech-to-Text (ASR).
* **Live Stage Setup**: Interactive configuration dashboard where you can check your audio hardware (microphone level test), select audience size, and toggle audience profiles.
* **Audience Persona Settings**: Simulate pitches to specific personas (Investor, Executive, Professor, Hackathon Judge, or Customer) with tailored questions and styles.
* **Advanced Multi-Agent Scoring**: Gets detailed report scores on 7 dimensions (Clarity, Confidence, Technical rigor, Storytelling, Persuasiveness, Conciseness, and Verbatim Reading detection).
* **Slides & Screen-share Integration**: Upload PPTX/PDF presentation slides or share your desktop screen during live practice.

---

## 🛠️ Tech Stack

* **Frontend**: React, Next.js (App Router), Zustand (State Management), Framer Motion, Tailwind CSS, Shadcn UI
* **Database**: SQLite (Local Database), Prisma ORM
* **AI/Voice Engines**: 
  * Speech-to-Text (ASR) for transcription
  * Cartesia API for hyper-realistic Text-to-Speech (TTS) voices
  * LLM-based audience agent simulation and presentation evaluation

---

## 💻 Getting Started

### Prerequisites

* Node.js (v18+) or Bun
* A `.env` file in the root directory (see config structure below)

### Environment Configuration

Create a `.env` file in the root folder:

```env
DATABASE_URL="file:./db/custom.db"
GROQ_API_KEY="your-groq-api-key"
CARTESIA_API_KEY="your-cartesia-api-key"
```

### Installation

1. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

2. Initialize the SQLite database schema:
   ```bash
   npm run db:push
   # or
   npx prisma db push
   ```

3. Launch the development server:
   ```bash
   npm run dev
   # or
   npx next dev -p 3000
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.
