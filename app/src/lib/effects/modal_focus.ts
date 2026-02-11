/**
 * @param {boolean} open
 * @param {HTMLElement | null} modalEl
 */
export function focusModalOnOpen(open, modalEl) {
  if (open && modalEl) {
    modalEl.focus();
  }
}

/**
 * @param {boolean} open
 * @param {HTMLElement | null} modalEl
 * @param {() => void} focusTarget
 */
export function trapModalFocus(open, modalEl, focusTarget) {
  if (!open || !modalEl) return null;
  /** @param {FocusEvent} event */
  const onFocusIn = (event) => {
    if (!open) return;
    if (modalEl.contains(event.target)) return;
    focusTarget();
  };
  document.addEventListener("focusin", onFocusIn);
  return () => document.removeEventListener("focusin", onFocusIn);
}

/**
 * @param {boolean} open
 * @param {() => Promise<void>} tick
 * @param {HTMLInputElement | null} inputEl
 * @param {HTMLElement | null} modalEl
 */
export async function focusModalInputOnOpen(open, tick, inputEl, modalEl) {
  if (!open) return;
  await tick();
  if (inputEl) {
    inputEl.focus({ preventScroll: true });
    inputEl.select();
  } else if (modalEl) {
    modalEl.focus();
  }
}

/**
 * @param {boolean} open
 * @param {() => Promise<void>} tick
 * @param {HTMLElement | null} modalEl
 * @param {HTMLElement | null} closeButton
 */
export async function focusPropertiesOnOpen(open, tick, modalEl, closeButton) {
  if (!open || !modalEl) return;
  await tick();
  const focusTarget = () => {
    if (closeButton) {
      closeButton.focus({ preventScroll: true });
    } else {
      modalEl.focus();
    }
  };
  focusTarget();
  setTimeout(() => {
    if (open) {
      focusTarget();
    }
  }, 0);
}
