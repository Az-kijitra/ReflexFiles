/**
 * @param {object} params
 * @param {(key: string, params?: Record<string, string | number>) => string} params.t
 * @param {(action: string, key: string) => boolean} params.matchesAction
 * @param {(err: unknown) => void} params.showError
 * @param {() => void} params.clearTree
 * @param {() => Promise<void>} params.loadCurrentDir
 * @param {() => number} params.selectedCount
 * @param {() => any[]} params.dropdownItemsSafe
 */
export function buildPageInitValuesInputs(params) {
  return {
    t: params.t,
    matchesAction: params.matchesAction,
    showError: params.showError,
    clearTree: params.clearTree,
    loadCurrentDir: params.loadCurrentDir,
    getSelectedCount: params.selectedCount,
    getDropdownItemsSafe: params.dropdownItemsSafe,
  };
}
