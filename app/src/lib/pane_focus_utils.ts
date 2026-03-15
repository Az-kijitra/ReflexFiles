/**
 * Shared utility for DOM-focus-based pane detection.
 *
 * This is the single source of truth for "which pane has keyboard focus?".
 * Use this instead of reading `activePaneId` for action routing, because
 * activePaneId can lag behind or be set incorrectly. DOM focus is always
 * authoritative.
 */

/**
 * Returns true if the current document focus is within the given right-pane
 * elements. Intended to be called at action dispatch time (not at setup time),
 * so refs can be bound after component mount.
 */
export function isRightPaneFocused(rightRefs: {
  listEl: HTMLElement | null;
  pathInputEl: HTMLInputElement | null;
}): boolean {
  const activeEl = document.activeElement;
  if (!activeEl) return false;
  return (
    (!!rightRefs.listEl &&
      (activeEl === rightRefs.listEl || !!rightRefs.listEl.contains?.(activeEl))) ||
    (!!rightRefs.pathInputEl && activeEl === rightRefs.pathInputEl)
  );
}
