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

  // s(field): setter that writes to state (field name matches params.set key)
  const s = (field) => (v) => { state[field] = v; };

  const mountedState = buildPageMountStateFromVars({
    get: {
      currentPath:       () => state.currentPath,
      watchRefreshTimer: params.get.watchRefreshTimer,
      updateWindowBounds:params.get.updateWindowBounds,
    },
    set: {
      watchRefreshTimer:       params.set.watchRefreshTimer,   // passthrough
      dirStatsTimeoutMs:       s("dirStatsTimeoutMs"),
      showHidden:              s("showHidden"),
      showSize:                s("showSize"),
      showTime:                s("showTime"),
      showTree:                s("showTree"),
      sortKey:                 s("sortKey"),
      sortOrder:               s("sortOrder"),
      uiTheme:                 (v) => { state.ui_theme = v; },         // field name differs
      uiLanguage:              (v) => { state.ui_language = v; },      // field name differs
      uiFileIconMode:          (v) => { state.ui_file_icon_mode = v; },// field name differs
      keymapProfile:           s("keymapProfile"),
      externalAppAssociations: s("externalAppAssociations"),
      externalApps:            s("externalApps"),
      keymapCustom:            s("keymapCustom"),
      loggingEnabled:          s("loggingEnabled"),
      logFile:                 s("logFile"),
      pathHistory:             s("pathHistory"),
      jumpList:                s("jumpList"),
      searchHistory:           s("searchHistory"),
      uiConfigLoaded:          s("uiConfigLoaded"),
      windowBounds:            s("windowBounds"),
      windowBoundsReady:       s("windowBoundsReady"),
      updateWindowBounds:      params.set.updateWindowBounds,   // passthrough
    },
  });

  // Extra accessors needed by page lifecycle (e.g. D&D, paste confirmation)
  return {
    ...mountedState,
    getEntries:                  () => state.entries,
    getCurrentPathCapabilities:  () => state.currentPathCapabilities,
    setPasteConfirmOpen:   s("pasteConfirmOpen"),
    setPastePendingPaths:  s("pastePendingPaths"),
    setPasteConflicts:     s("pasteConflicts"),
    setPasteMode:          s("pasteMode"),
    setPasteApplyAll:      s("pasteApplyAll"),
    setPasteConfirmIndex:  s("pasteConfirmIndex"),
  };
}
