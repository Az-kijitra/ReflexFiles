import { createUiSaveHelpers } from "../page_ui_save";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildUiSaveSectionInputs(params, markReady) {
  return {
    createUiSaveHelpers,
    invoke: params.deps.invoke,
    getUiConfigLoaded: params.state.getUiConfigLoaded,
    getCurrentPath: params.state.getCurrentPath,
    getWindowBounds: params.state.getWindowBounds,
    getWindowBoundsReady: params.state.getWindowBoundsReady,
    getShowHidden: params.state.getShowHidden,
    getShowSize: params.state.getShowSize,
    getShowTime: params.state.getShowTime,
    getShowTree: params.state.getShowTree,
    getSortKey: params.state.getSortKey,
    getSortOrder: params.state.getSortOrder,
    getPathHistory: params.state.getPathHistory,
    getJumpList: params.state.getJumpList,
    getSearchHistory: params.state.getSearchHistory,
    getTheme: params.state.getTheme,
    getUiSaveTimer: params.state.getUiSaveTimer,
    setUiSaveTimer: params.set.setUiSaveTimer,
    showError: params.values.showError,
    setSaveUiStateNow: params.set.setSaveUiStateNow,
    setScheduleUiSave: params.set.setScheduleUiSave,
    markReady,
  };
}
