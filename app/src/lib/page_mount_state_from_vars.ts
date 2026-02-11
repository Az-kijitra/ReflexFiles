/**
 * @param {{
 *   get: {
 *     currentPath: () => string;
 *     watchRefreshTimer: () => ReturnType<typeof setTimeout> | null;
 *     updateWindowBounds: () => () => Promise<void>;
 *   };
 *   set: {
 *     watchRefreshTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     dirStatsTimeoutMs: (value: number) => void;
 *     showHidden: (value: boolean) => void;
 *     showSize: (value: boolean) => void;
 *     showTime: (value: boolean) => void;
 *     showTree: (value: boolean) => void;
 *     sortKey: (value: string) => void;
 *     sortOrder: (value: string) => void;
 *     uiTheme: (value: "light" | "dark") => void;
 *     uiLanguage: (value: "en" | "ja") => void;
 *     keymapProfile: (value: "windows" | "vim") => void;
 *     externalAppAssociations: (value: Record<string, string>) => void;
 *     externalApps: (value: import("$lib/types").ExternalAppConfig[]) => void;
 *     keymapCustom: (value: Record<string, string>) => void;
 *     loggingEnabled: (value: boolean) => void;
 *     logFile: (value: string) => void;
 *     pathHistory: (value: string[]) => void;
 *     jumpList: (value: import("$lib/types").JumpItem[]) => void;
 *     searchHistory: (value: string[]) => void;
 *     uiConfigLoaded: (value: boolean) => void;
 *     windowBounds: (value: {
 *       x: number;
 *       y: number;
 *       width: number;
 *       height: number;
 *       maximized: boolean;
 *     }) => void;
 *     windowBoundsReady: (value: boolean) => void;
 *     updateWindowBounds: (value: () => Promise<void>) => void;
 *   };
 * }} params
 */
export function buildPageMountStateFromVars(params) {
  return {
    getCurrentPath: () => params.get.currentPath(),
    getWatchRefreshTimer: () => params.get.watchRefreshTimer(),
    setWatchRefreshTimer: (value) => {
      params.set.watchRefreshTimer(value);
    },
    setDirStatsTimeoutMs: (value) => {
      params.set.dirStatsTimeoutMs(value);
    },
    setShowHidden: (value) => {
      params.set.showHidden(value);
    },
    setShowSize: (value) => {
      params.set.showSize(value);
    },
    setShowTime: (value) => {
      params.set.showTime(value);
    },
    setShowTree: (value) => {
      params.set.showTree(value);
    },
    setSortKey: (value) => {
      params.set.sortKey(value);
    },
    setSortOrder: (value) => {
      params.set.sortOrder(value);
    },
    setUiTheme: (value) => {
      params.set.uiTheme(value);
    },
    setUiLanguage: (value) => {
      params.set.uiLanguage(value);
    },
    setKeymapProfile: (value) => {
      params.set.keymapProfile(value);
    },
    setExternalAppAssociations: (value) => {
      params.set.externalAppAssociations(value);
    },
    setExternalApps: (value) => {
      params.set.externalApps(value);
    },
    setKeymapCustom: (value) => {
      params.set.keymapCustom(value);
    },
    setLoggingEnabled: (value) => {
      params.set.loggingEnabled(value);
    },
    setLogFile: (value) => {
      params.set.logFile(value);
    },
    setPathHistory: (value) => {
      params.set.pathHistory(value);
    },
    setJumpList: (value) => {
      params.set.jumpList(value);
    },
    setSearchHistory: (value) => {
      params.set.searchHistory(value);
    },
    updateWindowBounds: () => params.get.updateWindowBounds()(),
    setUiConfigLoaded: (value) => {
      params.set.uiConfigLoaded(value);
    },
    setWindowBounds: (value) => {
      params.set.windowBounds(value);
    },
    setWindowBoundsReady: (value) => {
      params.set.windowBoundsReady(value);
    },
    setUpdateWindowBounds: (value) => {
      params.set.updateWindowBounds(value);
    },
  };
}
