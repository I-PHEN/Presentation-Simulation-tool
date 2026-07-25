# Slice 2 · Part A — Unblock Upload + Clean Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make deck upload work reliably by resolving a libs-capable Python instead of a bare `python` off PATH, surface real errors, and provide a one-shot dev-data reset.

**Architecture:** A memoized `resolvePythonInterpreter()` probes candidate interpreters and picks the first that can import the required libs; the upload route uses it for both Python subprocesses and returns actionable errors. A `db:reset-data` script wipes dev rows + generated assets.

**Tech Stack:** Next.js 16 App Router, TypeScript, Node `child_process`, Prisma/SQLite, Vitest (`environment: 'node'`, injected-fake unit tests — NO jsdom).

**Spec:** `docs/superpowers/specs/2026-07-25-slice-2-intake-structure-topic-mode-design.md` (Part A).

## Global Constraints

- Branch: `slice-2-topic-mode`. Never stage unrelated dirty worktree files (`fetch_intro.js`, `src/lib/store.ts`, `src/components/*-section.tsx`, `src/components/scoring-dashboard.tsx`, `src/app/api/multi-chat|score|transcribe/*`, etc.). Stage only each task's named files.
- Existing full suite stays green; no edits to prior test files.
- Root cause being fixed (verified): the Next.js server resolves bare `python` to a different interpreter than the shell (three pythons on PATH; only `C:\Python313` has `pypdfium2`+`pdfplumber`), so both Python steps fail silently and the route returns the misleading "No pages could be rendered."
- Vitest node env; the resolver's candidate-ordering logic is unit-tested against an injected probe fake; the real `execFile` glue is a thin untested adapter (matches `voice-engine.ts` convention).
- Run tests with `npm.cmd run test` (Git Bash; do NOT pipe through `tail`). Build with `npm.cmd run build` (exit 0; the Office trace-copy ENOENT warning at the very end is a known non-fatal environment warning).

---

### Task 1: Python interpreter resolver (`python-runtime.ts`)

**Files:**
- Create: `src/features/defense/python-runtime.ts`
- Test: `src/features/defense/python-runtime.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type PythonRuntime = { command: string; baseArgs: string[] }`
  - `candidateInterpreters(env: { PYTHON_PATH?: string }): PythonRuntime[]`
  - `pickInterpreter(candidates: PythonRuntime[], probe: (rt: PythonRuntime) => Promise<boolean>): Promise<PythonRuntime>` — returns the first candidate whose `probe` resolves true; throws if none.
  - `resolvePythonInterpreter(): Promise<PythonRuntime>` — memoized; wires `candidateInterpreters(process.env)` + a real `execFile` probe that runs `import pypdfium2, pdfplumber`.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { candidateInterpreters, pickInterpreter, type PythonRuntime } from './python-runtime';

describe('candidateInterpreters', () => {
  it('lists PYTHON_PATH first, then the portable fallbacks', () => {
    const list = candidateInterpreters({ PYTHON_PATH: 'C:/Python313/python.exe' });
    expect(list[0]).toEqual({ command: 'C:/Python313/python.exe', baseArgs: [] });
    // py -3 launcher and python3/python fallbacks are present after it
    expect(list).toContainEqual({ command: 'py', baseArgs: ['-3'] });
    expect(list).toContainEqual({ command: 'python3', baseArgs: [] });
    expect(list).toContainEqual({ command: 'python', baseArgs: [] });
  });

  it('omits the PYTHON_PATH entry when unset', () => {
    const list = candidateInterpreters({});
    expect(list.some((c) => c.baseArgs.length === 0 && c.command === '')).toBe(false);
    expect(list[0]).toEqual({ command: 'py', baseArgs: ['-3'] });
  });
});

describe('pickInterpreter', () => {
  it('returns the first candidate whose probe succeeds', async () => {
    const candidates: PythonRuntime[] = [
      { command: 'py', baseArgs: ['-3'] },
      { command: 'python3', baseArgs: [] },
      { command: 'python', baseArgs: [] },
    ];
    const probe = vi.fn(async (rt: PythonRuntime) => rt.command === 'python3');
    const picked = await pickInterpreter(candidates, probe);
    expect(picked).toEqual({ command: 'python3', baseArgs: [] });
    expect(probe).toHaveBeenCalledTimes(2); // py failed, python3 succeeded, python never tried
  });

  it('throws a clear error when no candidate can run the required libs', async () => {
    const candidates: PythonRuntime[] = [{ command: 'python', baseArgs: [] }];
    await expect(pickInterpreter(candidates, async () => false)).rejects.toThrow(/pypdfium2/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- python-runtime`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type PythonRuntime = { command: string; baseArgs: string[] };

const REQUIRED_IMPORTS = 'import pypdfium2, pdfplumber';

export function candidateInterpreters(env: { PYTHON_PATH?: string }): PythonRuntime[] {
  const list: PythonRuntime[] = [];
  if (env.PYTHON_PATH && env.PYTHON_PATH.trim()) list.push({ command: env.PYTHON_PATH.trim(), baseArgs: [] });
  list.push({ command: 'py', baseArgs: ['-3'] });
  list.push({ command: 'python3', baseArgs: [] });
  list.push({ command: 'python', baseArgs: [] });
  return list;
}

export async function pickInterpreter(candidates: PythonRuntime[], probe: (rt: PythonRuntime) => Promise<boolean>): Promise<PythonRuntime> {
  for (const candidate of candidates) {
    let ok = false;
    try { ok = await probe(candidate); } catch { ok = false; }
    if (ok) return candidate;
  }
  throw new Error('No usable Python interpreter found. Install Python with the "pypdfium2" and "pdfplumber" packages, or set PYTHON_PATH to one that has them.');
}

async function realProbe(rt: PythonRuntime): Promise<boolean> {
  try {
    await execFileAsync(rt.command, [...rt.baseArgs, '-c', REQUIRED_IMPORTS], { timeout: 8_000 });
    return true;
  } catch {
    return false;
  }
}

let cached: Promise<PythonRuntime> | null = null;
export function resolvePythonInterpreter(): Promise<PythonRuntime> {
  if (!cached) cached = pickInterpreter(candidateInterpreters(process.env), realProbe);
  return cached;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd run test -- python-runtime`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/defense/python-runtime.ts src/features/defense/python-runtime.test.ts
git commit -m "feat: resolve a libs-capable Python interpreter instead of bare PATH python"
```

---

### Task 2: Use the resolver + surface real errors in the upload route

**Files:**
- Modify: `src/app/api/upload-presentation/route.ts`

**Interfaces:**
- Consumes: `resolvePythonInterpreter`, `PythonRuntime` (Task 1).
- Produces: uploads run the resolved interpreter; when rendering yields nothing, the response includes the actual subprocess diagnostic.

- [ ] **Step 1: Add the import and thread the interpreter into `processPDF`**

At the top of `route.ts` add:

```typescript
import { resolvePythonInterpreter, type PythonRuntime } from '@/features/defense/python-runtime';
```

Change `processPDF`'s signature to accept the runtime and return a diagnostic, and replace both `execFileAsync(PYTHON, [...])` calls with the runtime. Replace the whole `processPDF` function with:

```typescript
async function processPDF(pdfPath: string, tmpDir: string, python: PythonRuntime): Promise<{ text: string; images: string[]; slideTexts: string[]; diagnostic: string | null }> {
  let text = '';
  let images: string[] = [];
  let slideTexts: string[] = [];
  let diagnostic: string | null = null;

  try {
    const { stdout } = await execFileAsync(python.command, [
      ...python.baseArgs,
      '-c',
      `import sys
import io
import json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import pdfplumber
pdf = pdfplumber.open(sys.argv[1])
pages = []
for p in pdf.pages:
    pages.append(p.extract_text() or "")
print(json.dumps(pages))
pdf.close()`,
      pdfPath,
    ], { timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
    slideTexts = JSON.parse(stdout) as string[];
    text = slideTexts.join('\n\n');
  } catch (e) {
    console.error('Text extraction error:', e);
    diagnostic = `text extraction: ${(e as { stderr?: string }).stderr?.toString().trim() || (e instanceof Error ? e.message : 'unknown')}`;
  }

  const maxSlides = 30;
  if (slideTexts.length > maxSlides) throw Object.assign(new Error(`Deck has ${slideTexts.length} slides; the maximum supported length is ${maxSlides}.`), { code: 'DECK_TOO_LARGE' });

  const imgDir = path.join(tmpDir, 'slides');
  await fs.promises.mkdir(imgDir, { recursive: true });

  const script = `
import pypdfium2 as pdfium
import sys
from PIL import Image
import io
import os

pdf = pdfium.PdfDocument(sys.argv[1])
max_pages = len(pdf)
for i in range(max_pages):
    page = pdf[i]
    bitmap = page.render(scale=1.5)
    pil_image = bitmap.to_pil()
    out_path = os.path.join(sys.argv[2], f"s-{i}.jpg")
    pil_image.convert("RGB").save(out_path, "JPEG", quality=82, optimize=True)
pdf.close()
`;

  try {
    const scriptPath = path.join(tmpDir, 'render.py');
    await fs.promises.writeFile(scriptPath, script);
    await execFileAsync(python.command, [...python.baseArgs, scriptPath, pdfPath, imgDir], { timeout: 60000 });

    const files = (await fs.promises.readdir(imgDir))
      .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
      .sort((a, b) => {
        const na = parseInt(a.match(/s-(\d+)/)?.[1] || '0');
        const nb = parseInt(b.match(/s-(\d+)/)?.[1] || '0');
        return na - nb;
      });

    for (const f of files) {
      const imgBuf = await fs.promises.readFile(path.join(imgDir, f));
      images.push(imgBuf.toString('base64'));
    }
  } catch (e) {
    if ((e as { code?: string }).code === 'DECK_TOO_LARGE') throw e;
    console.error('Slide rendering error:', e);
    diagnostic = `slide rendering: ${(e as { stderr?: string }).stderr?.toString().trim() || (e instanceof Error ? e.message : 'unknown')}`;
  }

  return { text, images, slideTexts, diagnostic };
}
```

- [ ] **Step 2: Resolve the interpreter in POST and pass it to both `processPDF` calls; surface the diagnostic**

In the `POST` handler, immediately after the `validateDeckUpload` block (before writing the upload file is fine; must be before the first `processPDF`), add:

```typescript
    let python: PythonRuntime;
    try {
      python = await resolvePythonInterpreter();
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Python is unavailable for deck processing.', retryable: false }, { status: 503 });
    }
```

Change the two `processPDF(...)` call sites to pass `python`:
- In the PPTX branch: `const result = await processPDF(pdfPath, tmpDir, python);`
- In the PDF branch: `const result = await processPDF(uploadPath, tmpDir, python);`

Both branches already do `text = result.text; slideImages = result.images; slideTexts = result.slideTexts;` — keep those and also capture the diagnostic: add `const renderDiagnostic = result.diagnostic;` in each branch (declare `let renderDiagnostic: string | null = null;` next to the `let text`/`slideImages` declarations near the top of the try, and assign in each branch).

Replace the `slideImages.length === 0` guard with a diagnostic-aware version:

```typescript
    if (slideImages.length === 0) {
      return NextResponse.json(
        { error: renderDiagnostic ? `No pages could be rendered from this deck. (${renderDiagnostic})` : 'No pages could be rendered from this deck.', retryable: false },
        { status: 422 },
      );
    }
```

Remove the now-unused `const PYTHON = ...` line at the top of the file (the resolver replaces it).

- [ ] **Step 3: Verify build + suite**

Run: `npm.cmd run test`
Expected: full suite green (no test targets this route directly; confirms nothing else broke).

Run: `npm.cmd run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/upload-presentation/route.ts"
git commit -m "fix: upload uses a resolved Python interpreter and surfaces real render errors"
```

---

### Task 3: Dev-data reset script

**Files:**
- Create: `scripts/reset-data.mjs`
- Modify: `package.json` (add `db:reset-data` script)

**Interfaces:**
- Produces: `npm run db:reset-data` — deletes all Score/Message/Session/SpeakerProfile rows and removes `slides/` + `public/recordings/` asset dirs; leaves schema + guest auth intact.

- [ ] **Step 1: Write the reset script**

Create `scripts/reset-data.mjs`:

```javascript
import { PrismaClient } from '@prisma/client';
import { rm } from 'node:fs/promises';
import path from 'node:path';

const db = new PrismaClient();
const root = process.cwd();

async function main() {
  // Child rows first (FKs), then sessions, then profiles. Users are kept (auth identities).
  const scores = await db.score.deleteMany({});
  const messages = await db.message.deleteMany({});
  const sessions = await db.session.deleteMany({});
  const profiles = await db.speakerProfile.deleteMany({});

  for (const dir of ['slides', path.join('public', 'recordings')]) {
    await rm(path.join(root, dir), { recursive: true, force: true });
  }

  console.log(`Reset complete: ${sessions.count} sessions, ${scores.count} scores, ${messages.count} messages, ${profiles.count} profiles deleted; slide + recording assets removed.`);
  await db.$disconnect();
}

main().catch(async (e) => { console.error('Reset failed:', e); await db.$disconnect(); process.exit(1); });
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to `"scripts"`:

```json
    "db:reset-data": "node scripts/reset-data.mjs"
```

- [ ] **Step 3: Run the reset (this clears the seeded demo + test data now)**

Run: `npm.cmd run db:reset-data`
Expected: prints a "Reset complete: N sessions, ... deleted" summary; exits 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/reset-data.mjs package.json
git commit -m "chore: add db:reset-data to wipe dev sessions + assets"
```

---

### Task 4: In-browser upload verification

**Files:**
- Modify: `.superpowers/sdd/progress.md` (git-ignored scratch — update on disk; do not `git add`)

No production code. Proves the fix against the real pipeline.

- [ ] **Step 1: Set the convenience env pin (optional but recommended)**

Ensure `.env` contains `PYTHON_PATH=C:\Python313\python.exe` (the resolver works without it, but this pins the known-good interpreter). If `.env` is git-ignored (typical), just set it locally; do not commit secrets.

- [ ] **Step 2: Restart the dev server and upload a real deck**

Restart `npm.cmd run dev` (so the route + env reload). In the app: Guest Mode → Rehearse → upload a real PDF (and a PPTX). Confirm slides render as thumbnails and the deck is accepted (no "could not process").

- [ ] **Step 3: Confirm the honest-error path**

Temporarily rename/point `PYTHON_PATH` at a bad path (or unset and rely on resolver) to confirm that a genuine failure now returns an actionable message (the diagnostic in parentheses), not a bare "No pages could be rendered." Restore the good setting after.

- [ ] **Step 4: Update the ledger**

Append a "Slice 2 · Part A" section to `.superpowers/sdd/progress.md`: tasks + commit SHAs, the root cause, that `db:reset-data` was run, and the in-browser upload result (PDF + PPTX render).

---

## Self-Review

**Spec coverage (Part A):** §A1 resolver → Task 1 + wired in Task 2; §A2 honest errors → Task 2 (diagnostic surfaced); §A3 reset script → Task 3 (run in Task 3 step 3). Live verification → Task 4.

**Placeholder scan:** none — resolver + route edits + script are shown in full; the only conditional note (declare `renderDiagnostic` near the existing `let` block) states the exact variable and placement.

**Type consistency:** `PythonRuntime { command, baseArgs }` defined in Task 1, consumed by `processPDF(pdfPath, tmpDir, python: PythonRuntime)` and the POST resolver call in Task 2. `resolvePythonInterpreter(): Promise<PythonRuntime>` used once in POST. Script uses Prisma model names (`score`/`message`/`session`/`speakerProfile`) matching `schema.prisma`.
