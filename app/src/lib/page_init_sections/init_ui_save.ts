import { UiSaveSectionParams } from "./types";

/**
 * @param {UiSaveSectionParams} params
 */
export function initUiSaveSection(params: UiSaveSectionParams) {
  const { createUiSaveHelpers } = params;
  const { saveUiStateNow, scheduleUiSave } = createUiSaveHelpers({
    invoke: params.invoke,
    getUiConfigLoaded: params.getUiConfigLoaded,
    getCurrentPath: params.getCurrentPath,
    getWindowBounds: params.getWindowBounds,
    getWindowBoundsReady: params.getWindowBoundsReady,
    getShowHidden: params.getShowHidden,
    getShowSize: params.getShowSize,
    getShowTime: params.getShowTime,
    getShowTree: params.getShowTree,
    getSortKey: params.getSortKey,
    getSortOrder: params.getSortOrder,
    getPathHistory: params.getPathHistory,
    getJumpList: params.getJumpList,
    getSearchHistory: params.getSearchHistory,
    getTheme: params.getTheme,
    getUiSaveTimer: params.getUiSaveTimer,
    setUiSaveTimer: params.setUiSaveTimer,
    showError: params.showError,
  });
  params.setSaveUiStateNow(saveUiStateNow);
  params.setScheduleUiSave(scheduleUiSave);
  params.markReady("saveUiStateNow");
  params.markReady("scheduleUiSave");
}
