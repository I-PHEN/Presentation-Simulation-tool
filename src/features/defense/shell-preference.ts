export const SHELL_COLLAPSED_KEY = 'sparring-shell-collapsed';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

let memoryCollapsedCache: boolean | null = null;

export function getMemoryCollapsed(): boolean {
  if (memoryCollapsedCache !== null) {
    return memoryCollapsedCache;
  }
  if (typeof window !== 'undefined') {
    memoryCollapsedCache = readShellCollapsed(window.localStorage);
    return memoryCollapsedCache;
  }
  return false;
}

export function readShellCollapsed(storage: StorageLike): boolean {
  return storage.getItem(SHELL_COLLAPSED_KEY) === 'true';
}

export function writeShellCollapsed(storage: StorageLike, collapsed: boolean): void {
  memoryCollapsedCache = collapsed;
  storage.setItem(SHELL_COLLAPSED_KEY, String(collapsed));
}
