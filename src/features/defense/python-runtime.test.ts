import { describe, expect, it, vi } from 'vitest';
import { candidateInterpreters, pickInterpreter, type PythonRuntime } from './python-runtime';

describe('candidateInterpreters', () => {
  it('lists PYTHON_PATH first, then the portable fallbacks', () => {
    const list = candidateInterpreters({ PYTHON_PATH: 'C:/Python313/python.exe' });
    expect(list[0]).toEqual({ command: 'C:/Python313/python.exe', baseArgs: [] });
    expect(list).toContainEqual({ command: 'py', baseArgs: ['-3'] });
    expect(list).toContainEqual({ command: 'python3', baseArgs: [] });
    expect(list).toContainEqual({ command: 'python', baseArgs: [] });
  });

  it('omits the PYTHON_PATH entry when unset', () => {
    const list = candidateInterpreters({});
    expect(list.some((c) => c.command === '')).toBe(false);
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
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error when no candidate can run the required libs', async () => {
    const candidates: PythonRuntime[] = [{ command: 'python', baseArgs: [] }];
    await expect(pickInterpreter(candidates, async () => false)).rejects.toThrow(/pypdfium2/);
  });
});
