import { DirSectionParams } from "./types";

/**
 * @param {DirSectionParams} params
 */
export function initDirSection(params: DirSectionParams) {
  const { createDirHelpers } = params;
  const { loadDir } = createDirHelpers({
    invoke: params.invoke,
    getShowHidden: params.getShowHidden,
    getSortKey: params.getSortKey,
    getSortOrder: params.getSortOrder,
    setEntries: params.setEntries,
    setCurrentPath: params.setCurrentPath,
    setPathInput: params.setPathInput,
    scheduleWatch: params.getScheduleWatch(),
    setSelectedPaths: params.setSelectedPaths,
    setFocusedIndex: params.setFocusedIndex,
    setAnchorIndex: params.setAnchorIndex,
    getPathHistory: params.getPathHistory,
    setPathHistory: params.setPathHistory,
    scheduleUiSave: params.getScheduleUiSave(),
    getShowTree: params.getShowTree,
    buildTreeRoot: params.getBuildTreeRoot(),
    clearTree: params.clearTree,
    setLoading: params.setLoading,
    setError: params.setError,
    showError: params.showError,
  });
  params.setLoadDir(loadDir);
  params.markReady("loadDir");
}
