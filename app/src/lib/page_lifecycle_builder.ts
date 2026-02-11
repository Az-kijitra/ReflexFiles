import { buildLifecycleParams } from "$lib/page_lifecycle_params";
import { setupPageLifecycle } from "$lib/page_lifecycle";

/**
 * @param {object} params
 * @param {object} params.deps
 * @param {object} params.state
 * @param {object} params.handlers
 */
export function setupPageLifecycleFromParts({ deps, state, handlers }) {
  return setupPageLifecycle(
    buildLifecycleParams({
      homeDir: deps.homeDir,
      invoke: deps.invoke,
      listen: deps.listen,
      EVENT_FS_CHANGED: deps.EVENT_FS_CHANGED,
      EVENT_OP_PROGRESS: deps.EVENT_OP_PROGRESS,
      setStatusMessage: deps.setStatusMessage,
      showError: deps.showError,
      loadDir: deps.loadDir,
      getCurrentPath: state.getCurrentPath,
      getWatchRefreshTimer: state.getWatchRefreshTimer,
      setWatchRefreshTimer: state.setWatchRefreshTimer,
      setDirStatsTimeoutMs: state.setDirStatsTimeoutMs,
      setShowHidden: state.setShowHidden,
      setShowSize: state.setShowSize,
      setShowTime: state.setShowTime,
      setShowTree: state.setShowTree,
      setSortKey: state.setSortKey,
      setSortOrder: state.setSortOrder,
      setUiTheme: state.setUiTheme,
      setUiLanguage: state.setUiLanguage,
      setKeymapProfile: state.setKeymapProfile,
      setExternalAppAssociations: state.setExternalAppAssociations,
      setExternalApps: state.setExternalApps,
      setKeymapCustom: state.setKeymapCustom,
      setLoggingEnabled: state.setLoggingEnabled,
      setLogFile: state.setLogFile,
      setPathHistory: state.setPathHistory,
      setJumpList: state.setJumpList,
      setSearchHistory: state.setSearchHistory,
      updateWindowBounds: state.updateWindowBounds,
      setUiConfigLoaded: state.setUiConfigLoaded,
      getCurrentWindow: deps.getCurrentWindow,
      setWindowBounds: state.setWindowBounds,
      setWindowBoundsReady: state.setWindowBoundsReady,
      scheduleUiSave: deps.scheduleUiSave,
      onBeforeUnload: handlers.onBeforeUnload,
      onKeyDown: handlers.onKeyDown,
      onClick: handlers.onClick,
      recomputeStatusItems: deps.recomputeStatusItems,
      setUpdateWindowBounds: state.setUpdateWindowBounds,
      t: deps.t,
    })
  );
}
