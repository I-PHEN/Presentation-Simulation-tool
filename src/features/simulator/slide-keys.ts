/** Which slide an arrow key should move to, or null when the key should be
 * ignored. Kept pure so the rule is testable without a DOM. */
export function nextSlideForKey(key: string, context: {
  position: number;
  total: number;
  /** False in topic mode (one card) and outside the live rehearsal. */
  enabled: boolean;
  /** The user is in a text field — leave their caret alone. */
  typing?: boolean;
  /** A modifier is held — that is a browser shortcut, not slide nav. */
  modified?: boolean;
}): number | null {
  const { position, total, enabled, typing = false, modified = false } = context;
  if (!enabled || typing || modified || total < 2) return null;
  const step = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
  if (step === 0) return null;
  const target = position + step;
  if (target < 0 || target > total - 1) return null;
  return target;
}
