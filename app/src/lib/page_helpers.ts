import { STRINGS } from "$lib/ui_constants";

/**
 * @param {() => "en" | "ja"} getLanguage
 */
export function createTranslator(getLanguage) {
  /**
   * @param {string} key
   * @param {Record<string, string | number>} [vars]
   */
  return function t(key, vars = {}) {
    const table = STRINGS[getLanguage()] || STRINGS.en;
    const base = table[key] ?? STRINGS.en[key] ?? key;
    return base.replace(/\{(\w+)\}/g, (_, name) => {
      const value = vars[name];
      return value === undefined || value === null ? "" : String(value);
    });
  };
}

/**
 * @param {(name: string, ext: string, maxChars: number) => string} formatName
 * @param {() => number} getNameMaxChars
 */
export function createListNameFormatter(formatName, getNameMaxChars) {
  /** @param {string} name @param {string} ext */
  return function formatNameForList(name, ext) {
    return formatName(name, ext, getNameMaxChars());
  };
}

/** @param {HTMLElement | null} node */
export function autofocus(node) {
  const focus = () => {
    if (node && typeof node.focus === "function") {
      node.focus({ preventScroll: true });
    }
  };
  focus();
  requestAnimationFrame(focus);
  setTimeout(focus, 10);
  return {
    update() {
      focus();
    },
  };
}
