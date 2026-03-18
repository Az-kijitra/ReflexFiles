/**
 * Shared utility for DOM-focus-based pane detection.
 *
 * Primary authority: DOM focus (document.activeElement) for actions triggered
 * from within a pane element.
 * Fallback authority: state.activePaneId for actions triggered from overlays
 * (dropdown, modals) where DOM focus is outside both panes.
 */

/**
 * Returns true if the current document focus is within the given pane's
 * elements. Works for both left and right panes — pass the relevant refs.
 * Intended to be called at action dispatch time (not at setup time),
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
