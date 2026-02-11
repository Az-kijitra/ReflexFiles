/**
 * @param {KeyboardEvent} event
 * @param {object} params
 * @param {() => void} params.onConfirm
 * @param {() => void} params.onCancel
 * @param {boolean} [params.stopPropagation]
 * @returns {boolean}
 */
export function handleConfirmCancelKeydown(event, params) {
  const stop = params.stopPropagation ?? false;
  if (event.key === "Escape") {
    event.preventDefault();
    if (stop) event.stopPropagation();
    params.onCancel?.();
    return true;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (stop) event.stopPropagation();
    params.onConfirm?.();
    return true;
  }
  return false;
}

/**
 * @param {KeyboardEvent} event
 * @param {object} params
 * @param {number} params.choiceCount
 * @param {number} params.selectedIndex
 * @param {(index: number) => void} params.setSelectedIndex
 * @param {(index: number) => void} params.onSubmitIndex
 * @param {() => void} params.onCancel
 * @param {string[]} [params.arrowKeys]
 * @param {boolean} [params.stopPropagation]
 * @returns {boolean}
 */
export function handleChoiceModalKeydown(event, params) {
  const stop = params.stopPropagation ?? true;
  const arrowKeys = params.arrowKeys ?? [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
  ];
  const count = Math.max(0, params.choiceCount || 0);
  const current =
    typeof params.selectedIndex === "number" && params.selectedIndex >= 0
      ? params.selectedIndex
      : 0;

  if (event.key === "Escape") {
    event.preventDefault();
    if (stop) event.stopPropagation();
    params.onCancel?.();
    return true;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (stop) event.stopPropagation();
    params.onSubmitIndex?.(current);
    return true;
  }
  if (arrowKeys.includes(event.key)) {
    event.preventDefault();
    if (stop) event.stopPropagation();
    if (count <= 0) return true;
    const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const next = (current + delta + count) % count;
    params.setSelectedIndex?.(next);
    return true;
  }
  return false;
}
