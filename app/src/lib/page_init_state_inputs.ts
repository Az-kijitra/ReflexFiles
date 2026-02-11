/**
 * @param {object} params
 * @param {() => boolean} params.uiConfigLoaded
 * @param {() => string} params.currentPath
 * @param {() => any} params.windowBounds
 * @param {() => boolean} params.windowBoundsReady
 * @param {() => boolean} params.showHidden
 * @param {() => boolean} params.showSize
 * @param {() => boolean} params.showTime
 * @param {() => boolean} params.showTree
 * @param {() => string} params.sortKey
 * @param {() => string} params.sortOrder
 * @param {() => string[]} params.pathHistory
 * @param {() => string[]} params.jumpList
 * @param {() => string[]} params.searchHistory
 * @param {() => string} params.theme
 * @param {() => ReturnType<typeof setTimeout> | null} params.uiSaveTimer
 * @param {() => string} params.keymapProfile
 * @param {() => Record<string, string[]>} params.keymapCustom
 * @param {() => HTMLElement | null} params.listEl
 * @param {() => HTMLElement | null} params.listBodyEl
 * @param {() => number} params.listCols
 * @param {() => number} params.listRows
 * @param {() => number} params.visibleColStart
 * @param {() => number} params.visibleColEnd
 * @param {() => number} params.filteredCount
 * @param {() => HTMLElement | null} params.treeEl
 * @param {() => HTMLElement | null} params.treeBodyEl
 * @param {() => number} params.treeFocusedIndex
 * @param {() => any} params.treeRoot
 * @param {() => ReturnType<typeof setTimeout> | null} params.watchTimer
 * @param {() => HTMLElement | null} params.treeBodyElSafe
 * @param {() => number} params.treeFocusedIndexSafe
 * @param {() => HTMLElement | null} params.treeElSafe
 * @param {() => any} params.treeRootSafe
 * @param {() => (path: string) => Promise<void>} params.loadDir
 * @param {() => any[]} params.entries
 * @param {() => boolean} params.searchActive
 * @param {() => string} params.searchQuery
 * @param {() => boolean} params.searchRegex
 * @param {() => string} params.dropdownMode
 * @param {() => boolean} params.dropdownOpen
 * @param {() => number} params.dropdownIndex
 * @param {() => any[]} params.dropdownItems
 * @param {() => number} params.selectedCount
 * @param {() => string} params.statusMessage
 * @param {() => (err: unknown) => void} params.showError
 * @param {() => () => void} params.focusList
 * @param {() => (path: string) => Promise<void>} params.buildTreeRoot
 * @param {() => () => void} params.updateListRows
 * @param {() => boolean} params.sortMenuOpen
 * @param {() => number} params.sortMenuIndex
 * @param {() => HTMLElement | null} params.sortMenuEl
 * @param {() => () => void} params.scheduleUiSave
 * @param {() => (path: string) => void} params.scheduleWatch
 */
export function buildPageInitStateInputs(params) {
  return {
    getUiConfigLoaded: params.uiConfigLoaded,
    getCurrentPath: params.currentPath,
    getWindowBounds: params.windowBounds,
    getWindowBoundsReady: params.windowBoundsReady,
    getShowHidden: params.showHidden,
    getShowSize: params.showSize,
    getShowTime: params.showTime,
    getShowTree: params.showTree,
    getSortKey: params.sortKey,
    getSortOrder: params.sortOrder,
    getPathHistory: params.pathHistory,
    getJumpList: params.jumpList,
    getSearchHistory: params.searchHistory,
    getTheme: params.theme,
    getUiSaveTimer: params.uiSaveTimer,
    getKeymapProfile: params.keymapProfile,
    getKeymapCustom: params.keymapCustom,
    getListEl: params.listEl,
    getListBodyEl: params.listBodyEl,
    getListCols: params.listCols,
    getListRows: params.listRows,
    getVisibleColStart: params.visibleColStart,
    getVisibleColEnd: params.visibleColEnd,
    getFilteredCount: params.filteredCount,
    getTreeEl: params.treeEl,
    getTreeBodyEl: params.treeBodyEl,
    getTreeFocusedIndex: params.treeFocusedIndex,
    getTreeRoot: params.treeRoot,
    getWatchTimer: params.watchTimer,
    getTreeBodyElSafe: params.treeBodyElSafe,
    getTreeFocusedIndexSafe: params.treeFocusedIndexSafe,
    getTreeElSafe: params.treeElSafe,
    getTreeRootSafe: params.treeRootSafe,
    getLoadDir: params.loadDir,
    getEntries: params.entries,
    getSearchActive: params.searchActive,
    getSearchQuery: params.searchQuery,
    getSearchRegex: params.searchRegex,
    getDropdownMode: params.dropdownMode,
    getDropdownOpen: params.dropdownOpen,
    getDropdownIndex: params.dropdownIndex,
    getDropdownItems: params.dropdownItems,
    getSelectedCount: params.selectedCount,
    getStatusMessage: params.statusMessage,
    getShowError: params.showError,
    getFocusList: params.focusList,
    getBuildTreeRoot: params.buildTreeRoot,
    getUpdateListRows: params.updateListRows,
    getSortMenuOpen: params.sortMenuOpen,
    getSortMenuIndex: params.sortMenuIndex,
    getSortMenuEl: params.sortMenuEl,
    getScheduleUiSave: params.scheduleUiSave,
    getScheduleWatch: params.scheduleWatch,
  };
}
