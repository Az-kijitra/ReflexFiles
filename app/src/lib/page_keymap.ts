/**
 * @param {object} params
 * @param {() => "windows" | "vim"} params.getKeymapProfile
 * @param {() => Record<string, string>} params.getKeymapCustom
 * @param {(value: Record<string, string>) => void} params.setKeymapCustom
 * @param {() => void} params.scheduleUiSave
 * @param {Record<string, Record<string, string>>} params.KEYMAP_DEFAULTS
 * @param {(value: string) => string[]} params.splitBindings
 * @param {(value: string) => string} params.normalizeKeyString
 * @param {(event: KeyboardEvent) => string} params.eventToKeyString
 */
export function createKeymapHelpers(params) {
  const {
    getKeymapProfile,
    getKeymapCustom,
    setKeymapCustom,
    scheduleUiSave,
    KEYMAP_DEFAULTS,
    splitBindings,
    normalizeKeyString,
    eventToKeyString,
  } = params;

  /** @param {import("$lib/ui_types").ActionId} actionId */
  function getDefaultBinding(actionId) {
    return KEYMAP_DEFAULTS[getKeymapProfile()]?.[actionId] || "";
  }

  /** @param {import("$lib/ui_types").ActionId} actionId */
  function getCustomBinding(actionId) {
    const keymapCustom = getKeymapCustom();
    if (!keymapCustom || typeof keymapCustom !== "object") return "";
    const value = keymapCustom[actionId];
    return value === undefined ? "" : value;
  }

  /** @param {import("$lib/ui_types").ActionId} actionId */
  function getActionBindings(actionId) {
    const keymapCustom = getKeymapCustom();
    const custom = getCustomBinding(actionId);
    if (custom === "") {
      const hasOverride = keymapCustom && Object.prototype.hasOwnProperty.call(keymapCustom, actionId);
      if (hasOverride) return [];
    }
    const base = custom ? custom : getDefaultBinding(actionId);
    return splitBindings(base);
  }

  /**
   * @param {KeyboardEvent} event
   * @param {import("$lib/ui_types").ActionId} actionId
   */
  function matchesAction(event, actionId) {
    const key = normalizeKeyString(eventToKeyString(event));
    const bindings = getActionBindings(actionId);
    const normalized = bindings.map((binding) => normalizeKeyString(binding));
    if (normalized.includes(key)) return true;
    if (event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      const withoutShift = key.replace("Shift+", "");
      if (normalized.includes(withoutShift)) return true;
    }
    return false;
  }

  /**
   * @param {import("$lib/ui_types").ActionId} actionId
   * @param {string} value
   */
  function setCustomBinding(actionId, value) {
    const keymapCustom = getKeymapCustom();
    setKeymapCustom({ ...(keymapCustom || {}), [actionId]: value });
    scheduleUiSave();
  }

  /** @param {import("$lib/ui_types").ActionId} actionId */
  function resetCustomBinding(actionId) {
    const keymapCustom = getKeymapCustom();
    if (!keymapCustom || typeof keymapCustom !== "object") return;
    if (!Object.prototype.hasOwnProperty.call(keymapCustom, actionId)) return;
    const next = { ...keymapCustom };
    delete next[actionId];
    setKeymapCustom(next);
    scheduleUiSave();
  }

  /**
   * @param {KeyboardEvent} event
   * @param {import("$lib/ui_types").ActionId} actionId
   */
  function captureBinding(event, actionId) {
    if (event.key === "Tab") return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") {
      event.currentTarget.blur();
      return;
    }
    setCustomBinding(actionId, eventToKeyString(event));
  }

  /** @param {import("$lib/ui_types").ActionId} actionId */
  function getMenuShortcut(actionId) {
    if (!actionId) return "";
    const bindings = getActionBindings(actionId);
    return bindings.length ? bindings.join(", ") : "";
  }

  return {
    getDefaultBinding,
    getCustomBinding,
    getActionBindings,
    matchesAction,
    setCustomBinding,
    resetCustomBinding,
    captureBinding,
    getMenuShortcut,
  };
}
