/**
 * @typedef {(action: string) => string} GetBinding
 * @typedef {(action: string) => string[]} GetActionBindings
 * @typedef {(action: string, value: string) => void} SetCustomBinding
 * @typedef {(action: string) => void} ResetCustomBinding
 * @typedef {(event: KeyboardEvent) => string | null} CaptureBinding
 */

export function createKeymapBindingsState() {
  const bindings = {
    /** @type {GetBinding} */
    getDefaultBinding: () => "",
    /** @type {GetBinding} */
    getCustomBinding: () => "",
    /** @type {GetActionBindings} */
    getActionBindings: () => [],
    /** @type {SetCustomBinding} */
    setCustomBinding: () => {},
    /** @type {ResetCustomBinding} */
    resetCustomBinding: () => {},
    /** @type {CaptureBinding} */
    captureBinding: () => null,
    /** @type {(action: string) => string} */
    getMenuShortcut: () => "",
  };

  const setters = {
    /** @param {GetBinding} value */
    getDefaultBinding: (value) => {
      bindings.getDefaultBinding = value;
    },
    /** @param {GetBinding} value */
    getCustomBinding: (value) => {
      bindings.getCustomBinding = value;
    },
    /** @param {GetActionBindings} value */
    getActionBindings: (value) => {
      bindings.getActionBindings = value;
    },
    /** @param {SetCustomBinding} value */
    setCustomBinding: (value) => {
      bindings.setCustomBinding = value;
    },
    /** @param {ResetCustomBinding} value */
    resetCustomBinding: (value) => {
      bindings.resetCustomBinding = value;
    },
    /** @param {CaptureBinding} value */
    captureBinding: (value) => {
      bindings.captureBinding = value;
    },
    /** @param {(action: string) => string} value */
    getMenuShortcut: (value) => {
      bindings.getMenuShortcut = value;
    },
  };

  return { bindings, setters };
}
