export const ABOUT_URL = "https://github.com/Az-kijitra/ReflexFiles";
export const ABOUT_LICENSE = "MIT";
export const ZIP_PASSWORD_MAX_ATTEMPTS = 3;
export const UNDO_LIMIT = 50;
export const DIR_STATS_CACHE_LIMIT = 50;
/** Maximum number of entries retained in the path navigation history. */
export const PATH_HISTORY_LIMIT = 50;
export const TREE_AUTO_EXPAND_DEPTH = 2;
export const TREE_AUTO_EXPAND_ENTRY_LIMIT = 1000;

// ── UI measurements ───────────────────────────────────────────────────────────

/** Width of the Git panel; must match the CSS variable --git-panel-width. */
export const GIT_PANEL_WIDTH = "300px";

// ── Debounce timers ───────────────────────────────────────────────────────────

/** Debounce delay (ms) before persisting the undo/redo session to disk. */
export const UNDO_SAVE_DEBOUNCE_MS = 250;
/** Debounce delay (ms) before reloading the directory after a filesystem-change event. */
export const FS_WATCH_DEBOUNCE_MS = 300;

// ── DOM selectors ─────────────────────────────────────────────────────────────

/**
 * CSS selector matching all modal/overlay elements that should suppress
 * global keyboard shortcuts (e.g. Ctrl+G, F3, Ctrl+W, Tab routing).
 */
export const MODAL_OVERLAY_SELECTOR =
  ".modal, .modal-backdrop, .context-menu, .dropdown, .menu-dropdown, .sort-menu";
