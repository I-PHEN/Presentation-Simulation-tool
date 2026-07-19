import { describe, expect, it } from 'vitest';
import { readShellCollapsed, writeShellCollapsed } from './shell-preference';

const storage = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
};

describe('shell-preference', () => {
  it('starts expanded and persists a collapsed rail preference', () => {
    expect(readShellCollapsed(fakeStorage)).toBe(false);
    writeShellCollapsed(fakeStorage, true);
    expect(readShellCollapsed(fakeStorage)).toBe(true);
  });
});
