/**
 * @param {boolean} contextMenuOpen
 * @param {(event: KeyboardEvent) => boolean} handleContextMenuKey
 */
export function setupContextMenuKeydown(contextMenuOpen, handleContextMenuKey) {
  if (!contextMenuOpen) return null;
  /** @param {KeyboardEvent} event */
  const onContextKey = (event) => {
    if (!contextMenuOpen) return;
    const handled = handleContextMenuKey(event);
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  window.addEventListener("keydown", onContextKey, { capture: true });
  return () => window.removeEventListener("keydown", onContextKey, { capture: true });
}
