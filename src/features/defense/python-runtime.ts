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
