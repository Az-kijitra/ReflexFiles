import { createDirHelpers } from "../page_dir";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildDirSectionInputs(params, markReady) {
  return {
    createDirHelpers,
    invoke: params.deps.invoke,
    getShowHidden: params.state.getShowHidden,
    getSortKey: params.state.getSortKey,
    getSortOrder: params.state.getSortOrder,
    setEntries: params.set.setEntries,
    setCurrentPath: params.set.setCurrentPath,
    setPathInput: params.set.setPathInput,
    getScheduleWatch: params.state.getScheduleWatch,
    setSelectedPaths: params.set.setSelectedPaths,
    setFocusedIndex: params.set.setFocusedIndex,
    setAnchorIndex: params.set.setAnchorIndex,
    getPathHistory: params.state.getPathHistory,
    setPathHistory: params.set.setPathHistory,
    getScheduleUiSave: params.state.getScheduleUiSave,
    getShowTree: params.state.getShowTree,
    getBuildTreeRoot: params.state.getBuildTreeRoot,
    clearTree: params.values.clearTree,
    setLoading: params.set.setLoading,
    setError: params.set.setError,
    showError: params.values.showError,
    setLoadDir: params.set.setLoadDir,
    markReady,
  };
}
