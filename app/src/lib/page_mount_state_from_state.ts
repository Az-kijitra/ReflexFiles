import { buildPageMountStateFromVars } from "./page_mount_state_from_vars";

/**
 * @param {{
 *   state: any;
 *   get: {
 *     watchRefreshTimer: () => ReturnType<typeof setTimeout> | null;
 *     updateWindowBounds: () => () => Promise<void>;
 *   };
 *   set: {
 *     watchRefreshTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     updateWindowBounds: (value: () => Promise<void>) => void;
 *   };
 * }} params
 */
export function buildPageMountStateFromState(params) {
  const { state } = params;

  return buildPageMountStateFromVars({
    get: {
      currentPath: () => state.currentPath,
      watchRefreshTimer: params.get.watchRefreshTimer,
      updateWindowBounds: params.get.updateWindowBounds,
    },
    set: {
      watchRefreshTimer: params.set.watchRefreshTimer,
      dirStatsTimeoutMs: (value) => {
        state.dirStatsTimeoutMs = value;
      },
      showHidden: (value) => {
        state.showHidden = value;
      },
      showSize: (value) => {
        state.showSize = value;
      },
      showTime: (value) => {
        state.showTime = value;
      },
      showTree: (value) => {
        state.showTree = value;
      },
      sortKey: (value) => {
        state.sortKey = value;
      },
      sortOrder: (value) => {
        state.sortOrder = value;
      },
      uiTheme: (value) => {
        state.ui_theme = value;
      },
      uiLanguage: (value) => {
        state.ui_language = value;
      },
      keymapProfile: (value) => {
        state.keymapProfile = value;
      },
      externalAppAssociations: (value) => {
        state.externalAppAssociations = value;
      },
      externalApps: (value) => {
        state.externalApps = value;
      },
      keymapCustom: (value) => {
        state.keymapCustom = value;
      },
      loggingEnabled: (value) => {
        state.loggingEnabled = value;
      },
      logFile: (value) => {
        state.logFile = value;
      },
      pathHistory: (value) => {
        state.pathHistory = value;
      },
      jumpList: (value) => {
        state.jumpList = value;
      },
      searchHistory: (value) => {
        state.searchHistory = value;
      },
      uiConfigLoaded: (value) => {
        state.uiConfigLoaded = value;
      },
      windowBounds: (value) => {
        state.windowBounds = value;
      },
      windowBoundsReady: (value) => {
        state.windowBoundsReady = value;
      },
      updateWindowBounds: params.set.updateWindowBounds,
    },
  });
}
