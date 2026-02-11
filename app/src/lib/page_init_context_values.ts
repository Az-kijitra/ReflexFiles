/**
 * @param {{
 *   i18n: { t: (key: string, params?: Record<string, string | number>) => string };
 *   keymap: { matchesAction: (action: string, key: string) => boolean };
 *   error: { showError: (err: unknown) => void };
 *   tree: { clearTree: () => void };
 *   dir: { loadCurrentDir: () => Promise<void> };
 *   selection: { selectedCount: () => number };
 *   dropdown: { dropdownItemsSafe: () => unknown[] };
 * }} params
 */
export function buildInitPageValues(params) {
  return {
    t: params.i18n.t,
    matchesAction: params.keymap.matchesAction,
    showError: params.error.showError,
    clearTree: params.tree.clearTree,
    loadCurrentDir: params.dir.loadCurrentDir,
    selectedCount: params.selection.selectedCount,
    dropdownItemsSafe: params.dropdown.dropdownItemsSafe,
  };
}
