export const SHELL_COLLAPSED_KEY = 'sparring-shell-collapsed';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function readShellCollapsed(storage: StorageLike): boolean {
  return storage.getItem(SHELL_COLLAPSED_KEY) === 'true';
}

export function writeShellCollapsed(storage: StorageLike, collapsed: boolean): void {
  storage.setItem(SHELL_COLLAPSED_KEY, String(collapsed));
}
