/**
 * @param {(open: boolean, el: HTMLElement | null) => void} focusModalOnOpen
 * @param {{ open: boolean, el: HTMLElement | null }[]} configs
 */
export function applyModalFocuses(focusModalOnOpen, configs) {
  for (const config of configs) {
    focusModalOnOpen(config.open, config.el);
  }
}

/**
 * @param {(open: boolean, tick: () => Promise<void>, inputEl: HTMLInputElement | null, modalEl: HTMLElement | null) => void} focusModalInputOnOpen
 * @param {{ open: boolean, tick: () => Promise<void>, inputEl: HTMLInputElement | null, modalEl: HTMLElement | null }[]} configs
 */
export function applyModalInputFocuses(focusModalInputOnOpen, configs) {
  for (const config of configs) {
    focusModalInputOnOpen(config.open, config.tick, config.inputEl, config.modalEl);
  }
}

/**
 * @param {(open: boolean, modalEl: HTMLElement | null, onFocus: () => void) => void} trapModalFocus
 * @param {{ open: boolean, modalEl: HTMLElement | null, onFocus: () => void }[]} configs
 */
export function applyModalTraps(trapModalFocus, configs) {
  for (const config of configs) {
    trapModalFocus(config.open, config.modalEl, config.onFocus);
  }
}
