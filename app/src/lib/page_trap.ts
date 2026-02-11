/**
 * @param {KeyboardEvent} event
 * @param {HTMLElement | null} container
 */
export function trapModalTab(event, container) {
  if (event.key !== "Tab") return false;
  if (!container) return true;
  event.preventDefault();
  event.stopPropagation();
  const focusables = Array.from(
    container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.disabled && el.tabIndex !== -1);
  if (!focusables.length) {
    container.focus?.({ preventScroll: true });
    return true;
  }
  const active = document.activeElement;
  let index = focusables.indexOf(active);
  if (index < 0) index = 0;
  const nextIndex = event.shiftKey
    ? (index - 1 + focusables.length) % focusables.length
    : (index + 1) % focusables.length;
  focusables[nextIndex].focus({ preventScroll: true });
  return true;
}
