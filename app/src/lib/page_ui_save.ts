import { buildUiSnapshot, canSaveUiState, scheduleUiSave as scheduleUiSaveUtil } from "$lib/utils/ui_state";

/**
 * @param {object} params
 * @param {(command: string, payload?: Record<string, unknown>) => Promise<unknown>} params.invoke
 * @param {() => boolean} params.getUiConfigLoaded
 * @param {() => string} params.getCurrentPath
 * @param {() => unknown} params.getWindowBounds
 * @param {() => boolean} params.getWindowBoundsReady
 * @param {() => boolean} params.getShowHidden
 * @param {() => boolean} params.getShowSize
 * @param {() => boolean} params.getShowTime
 * @param {() => boolean} params.getShowTree
 * @param {() => string} params.getSortKey
 * @param {() => string} params.getSortOrder
 * @param {() => string[]} params.getPathHistory
 * @param {() => unknown[]} params.getJumpList
 * @param {() => string[]} params.getSearchHistory
 * @param {() => "light" | "dark"} params.getTheme
 * @param {() => ReturnType<typeof setTimeout> | null} params.getUiSaveTimer
 * @param {(value: ReturnType<typeof setTimeout> | null) => void} params.setUiSaveTimer
 * @param {(err: unknown) => void} params.showError
 */
export function createUiSaveHelpers(params) {
  const {
    invoke,
    getUiConfigLoaded,
    getCurrentPath,
    getWindowBounds,
    getWindowBoundsReady,
    getShowHidden,
    getShowSize,
    getShowTime,
    getShowTree,
    getSortKey,
    getSortOrder,
    getPathHistory,
    getJumpList,
    getSearchHistory,
    getTheme,
    getUiSaveTimer,
    setUiSaveTimer,
    showError,
  } = params;

  async function saveUiStateNow() {
    if (
      !canSaveUiState({
        uiConfigLoaded: getUiConfigLoaded(),
        currentPath: getCurrentPath(),
        windowBounds: getWindowBounds(),
        windowBoundsReady: getWindowBoundsReady(),
      })
    ) {
      return;
    }
    const snapshot = buildUiSnapshot({
      showHidden: getShowHidden(),
      showSize: getShowSize(),
      showTime: getShowTime(),
      showTree: getShowTree(),
      sortKey: getSortKey(),
      sortOrder: getSortOrder(),
      pathHistory: getPathHistory(),
      jumpList: getJumpList(),
      currentPath: getCurrentPath(),
      searchHistory: getSearchHistory(),
      ui_theme: getTheme(),
      windowBounds: getWindowBounds(),
    });
    try {
      await invoke("config_save_ui_state", snapshot);
    } catch (err) {
      showError(err);
    }
  }

  function scheduleUiSave(delay = 400) {
    scheduleUiSaveUtil({
      delay,
      canSave: () =>
        canSaveUiState({
          uiConfigLoaded: getUiConfigLoaded(),
          currentPath: getCurrentPath(),
          windowBounds: getWindowBounds(),
          windowBoundsReady: getWindowBoundsReady(),
        }),
      getTimer: () => getUiSaveTimer(),
      setTimer: (value) => {
        setUiSaveTimer(value);
      },
      save: () => {
        saveUiStateNow();
      },
    });
  }

  return { saveUiStateNow, scheduleUiSave };
}
