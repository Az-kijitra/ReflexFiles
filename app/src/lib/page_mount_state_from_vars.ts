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
 *     uiFileIconMode: (value: "by_type" | "simple" | "none") => void;
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
  // g(key): getter that reads from params.get
  const g = (key) => () => params.get[key]();
  // d(key): setter that delegates to params.set[key]
  const d = (key) => (v) => params.set[key](v);

  return {
    getCurrentPath:       g("currentPath"),
    getWatchRefreshTimer: g("watchRefreshTimer"),
    // Double-call: get the stored function, then invoke it
    updateWindowBounds:   () => params.get.updateWindowBounds()(),
    setWatchRefreshTimer:          d("watchRefreshTimer"),
    setDirStatsTimeoutMs:          d("dirStatsTimeoutMs"),
    setShowHidden:                 d("showHidden"),
    setShowSize:                   d("showSize"),
    setShowTime:                   d("showTime"),
    setShowTree:                   d("showTree"),
    setSortKey:                    d("sortKey"),
    setSortOrder:                  d("sortOrder"),
    setUiTheme:                    d("uiTheme"),
    setUiLanguage:                 d("uiLanguage"),
    setUiFileIconMode:             d("uiFileIconMode"),
    setKeymapProfile:              d("keymapProfile"),
    setExternalAppAssociations:    d("externalAppAssociations"),
    setExternalApps:               d("externalApps"),
    setKeymapCustom:               d("keymapCustom"),
    setLoggingEnabled:             d("loggingEnabled"),
    setLogFile:                    d("logFile"),
    setPathHistory:                d("pathHistory"),
    setJumpList:                   d("jumpList"),
    setSearchHistory:              d("searchHistory"),
    setUiConfigLoaded:             d("uiConfigLoaded"),
    setWindowBounds:               d("windowBounds"),
    setWindowBoundsReady:          d("windowBoundsReady"),
    setUpdateWindowBounds:         d("updateWindowBounds"),
  };
}
