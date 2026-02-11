/**
 * @param {object} params
 * @param {any} params.state
 * @param {Record<string, any>} params.actions
 * @param {(key: string, params?: Record<string, string | number>) => string} params.t
 * @param {(err: unknown) => void} params.showError
 */
export function buildInitRuntimeValuesFromPageState(params) {
  return {
    i18n: { t: params.t },
    keymap: {
      matchesAction: (...args) => params.actions.matchesAction(...args),
    },
    error: { showError: params.showError },
    tree: {
      clearTree: () => {
        params.state.treeRoot = null;
        params.state.treeSelectedPath = "";
        params.state.treeFocusedIndex = 0;
      },
    },
    dir: { loadCurrentDir: () => params.actions.loadDir(params.state.currentPath) },
    selection: { selectedCount: () => params.state.selectedPaths.length },
    dropdown: { dropdownItemsSafe: () => params.state.dropdownItems },
  };
}
