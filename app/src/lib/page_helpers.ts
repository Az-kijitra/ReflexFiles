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

/**
 * Normalize a raw capabilities object from the backend, defaulting all
 * boolean fields to `true` when missing or null.
 */
export function normalizeProviderCapabilities(value: unknown) {
  const v = value as Record<string, unknown> | null | undefined;
  return {
    can_read:            Boolean(v?.can_read            ?? true),
    can_create:          Boolean(v?.can_create          ?? true),
    can_rename:          Boolean(v?.can_rename          ?? true),
    can_copy:            Boolean(v?.can_copy            ?? true),
    can_move:            Boolean(v?.can_move            ?? true),
    can_delete:          Boolean(v?.can_delete          ?? true),
    can_archive_create:  Boolean(v?.can_archive_create  ?? true),
    can_archive_extract: Boolean(v?.can_archive_extract ?? true),
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
  let timer = setTimeout(focus, 10);
  return {
    update() {
      focus();
    },
    destroy() {
      clearTimeout(timer);
    },
  };
}
