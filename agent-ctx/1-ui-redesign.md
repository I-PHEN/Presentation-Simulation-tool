---
Task ID: 1
Agent: UI Redesign Agent
Task: Complete UI Redesign - Step-by-Step Setup Wizard + Better Presentation Mode

Work Log:
- Read worklog.md to understand previous work (4-step flow: Setup → Present → Q&A → Results)
- Read all existing components: store.ts, page.tsx, setup-section.tsx, present-section.tsx, qna-section.tsx, scoring-dashboard.tsx
- Read API routes: upload-presentation/route.ts, session/route.ts
- Updated store.ts: Added step mapping comments (1=Upload, 2=Configure, 3=Present, 4=Q&A, 5=Results), no structural changes needed since step was already a number
- Created upload-section.tsx (Step 1): Clean focused upload experience with drag & drop, title input, slide thumbnails, manual paste option, Next button
- Created configure-section.tsx (Step 2): Judge selection cards + AI behavior toggle, Back button, Start Presenting button (creates session → step 3)
- Deleted old setup-section.tsx (replaced by upload-section + configure-section)
- Updated page.tsx: 5 steps, new step labels (Upload/Configure/Present/Q&A/Results), imports for UploadSection + ConfigureSection, 5-step indicator dots
- Updated present-section.tsx: Better presentation feel with slides as main focus, click zones on left/right sides, keyboard navigation, subtle recording indicator, floating control bar, transcript hidden by default with toggle, animated transcript panel
- Updated qna-section.tsx: Changed setStep(4) → setStep(5) for results navigation
- Lint check passes clean
- App verified running on localhost:3000 returning HTTP 200

Stage Summary:
- Complete 5-step wizard redesign implemented
- Step 1 (Upload): Focused, calming upload experience with drag & drop
- Step 2 (Configure): Judge panel selection + AI behavior toggle
- Step 3 (Present): Immersive presentation mode with large slides, floating controls, hidden transcript
- Step 4 (Q&A): Multi-judge Q&A (unchanged logic, updated step navigation)
- Step 5 (Results): Scoring dashboard (unchanged)
- Dark theme maintained with cyan accent (#06b6d4)
- Framer Motion animations for step transitions and transcript panel
- All shadcn/ui components used properly
- Session creation moved to Configure step (step 2)
- Content field never displayed to user (AI context only)
