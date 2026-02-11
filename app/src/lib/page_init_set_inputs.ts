/**
 * @param {object} params
 * @param {(value: ReturnType<typeof setTimeout> | null) => void} params.uiSaveTimer
 * @param {(value: () => Promise<void>) => void} params.saveUiStateNow
 * @param {(value: () => void) => void} params.scheduleUiSave
 * @param {(value: Record<string, string[]>) => void} params.keymapCustom
 * @param {(value: (action: string) => string) => void} params.getDefaultBinding
 * @param {(value: (action: string) => string) => void} params.getCustomBinding
 * @param {(value: (action: string) => string[]) => void} params.getActionBindings
 * @param {(value: (action: string, key: string) => boolean) => void} params.matchesAction
 * @param {(value: (action: string, binding: string) => void) => void} params.setCustomBinding
 * @param {(value: (action: string) => void) => void} params.resetCustomBinding
 * @param {(value: (action: string) => void) => void} params.captureBinding
 * @param {(value: (action: string) => string) => void} params.getMenuShortcut
 * @param {(value: number) => void} params.listRows
 * @param {(value: number) => void} params.listCols
 * @param {(value: number) => void} params.nameMaxChars
 * @param {(value: number) => void} params.visibleColStart
 * @param {(value: number) => void} params.visibleColEnd
 * @param {(value: boolean) => void} params.overflowLeft
 * @param {(value: boolean) => void} params.overflowRight
 * @param {(value: () => void) => void} params.updateListRows
 * @param {(value: () => void) => void} params.updateOverflowMarkers
 * @param {(value: () => void) => void} params.updateVisibleColumns
 * @param {(value: (start: number, rows?: number | null) => void) => void} params.setScrollStartColumn
 * @param {(value: (target: number, rows?: number | null) => void) => void} params.ensureColumnVisible
 * @param {(value: (delta: number) => void) => void} params.scrollListHorizontallyByColumns
 * @param {(value: (el: HTMLElement | null) => number) => void} params.getActualColumnSpan
 * @param {(value: number) => void} params.treeFocusedIndex
 * @param {(value: () => void) => void} params.focusList
 * @param {(value: () => void) => void} params.focusTree
 * @param {(value: () => void) => void} params.focusTreeTop
 * @param {(value: ReturnType<typeof setTimeout> | null) => void} params.watchTimer
 * @param {(value: (path: string) => void) => void} params.scheduleWatch
 * @param {(value: any) => void} params.treeRoot
 * @param {(value: string) => void} params.treeSelectedPath
 * @param {(value: boolean) => void} params.treeLoading
 * @param {(value: (path: string, depth: number, autoExpand: boolean) => Promise<void>) => void} params.expandTreeNode
 * @param {(value: (path: string) => Promise<void>) => void} params.buildTreeRoot
 * @param {(value: (node: any, index: number) => void) => void} params.selectTreeNode
 * @param {(value: (node: any, index: number, event?: MouseEvent) => void) => void} params.toggleTreeNode
 * @param {(value: (event: KeyboardEvent) => unknown) => void} params.handleTreeKey
 * @param {(value: any[]) => void} params.entries
 * @param {(value: string) => void} params.currentPath
 * @param {(value: string) => void} params.pathInput
 * @param {(value: string[]) => void} params.selectedPaths
 * @param {(value: number) => void} params.focusedIndex
 * @param {(value: number | null) => void} params.anchorIndex
 * @param {(value: string[]) => void} params.pathHistory
 * @param {(value: boolean) => void} params.loading
 * @param {(value: string) => void} params.error
 * @param {(value: (path: string) => Promise<void>) => void} params.loadDir
 * @param {(value: boolean) => void} params.showHidden
 * @param {(value: boolean) => void} params.showTree
 * @param {(value: string) => void} params.theme
 * @param {(value: () => void) => void} params.toggleHidden
 * @param {(value: () => void) => void} params.toggleTree
 * @param {(value: () => void) => void} params.toggleTheme
 * @param {(value: boolean) => void} params.sortMenuOpen
 * @param {(value: number) => void} params.sortMenuIndex
 * @param {(value: string) => void} params.sortKey
 * @param {(value: string) => void} params.sortOrder
 * @param {(value: (key: string) => void) => void} params.setSort
 * @param {(value: () => void) => void} params.openSortMenu
 * @param {(value: () => void) => void} params.closeSortMenu
 * @param {(value: (event: KeyboardEvent) => void) => void} params.handleSortMenuKey
 * @param {(value: any[]) => void} params.filteredEntries
 * @param {(value: string) => void} params.searchError
 * @param {(value: () => void) => void} params.recomputeSearch
 * @param {(value: any[]) => void} params.dropdownItems
 * @param {(value: any[]) => void} params.statusItems
 * @param {(value: number) => void} params.dropdownIndex
 * @param {(value: () => void) => void} params.recomputeDropdownItems
 * @param {(value: () => void) => void} params.recomputeStatusItems
 * @param {(value: () => void) => void} params.clampDropdownSelection
 */
export function buildPageInitSetInputs(params) {
  return {
    setUiSaveTimer: params.uiSaveTimer,
    setSaveUiStateNow: params.saveUiStateNow,
    setScheduleUiSave: params.scheduleUiSave,
    setKeymapCustom: params.keymapCustom,
    setGetDefaultBinding: params.getDefaultBinding,
    setGetCustomBinding: params.getCustomBinding,
    setGetActionBindings: params.getActionBindings,
    setMatchesAction: params.matchesAction,
    setSetCustomBinding: params.setCustomBinding,
    setResetCustomBinding: params.resetCustomBinding,
    setCaptureBinding: params.captureBinding,
    setGetMenuShortcut: params.getMenuShortcut,
    setListRows: params.listRows,
    setListCols: params.listCols,
    setNameMaxChars: params.nameMaxChars,
    setVisibleColStart: params.visibleColStart,
    setVisibleColEnd: params.visibleColEnd,
    setOverflowLeft: params.overflowLeft,
    setOverflowRight: params.overflowRight,
    setUpdateListRows: params.updateListRows,
    setUpdateOverflowMarkers: params.updateOverflowMarkers,
    setUpdateVisibleColumns: params.updateVisibleColumns,
    setSetScrollStartColumn: params.setScrollStartColumn,
    setEnsureColumnVisible: params.ensureColumnVisible,
    setScrollListHorizontallyByColumns: params.scrollListHorizontallyByColumns,
    setGetActualColumnSpan: params.getActualColumnSpan,
    setTreeFocusedIndex: params.treeFocusedIndex,
    setFocusList: params.focusList,
    setFocusTree: params.focusTree,
    setFocusTreeTop: params.focusTreeTop,
    setWatchTimer: params.watchTimer,
    setScheduleWatch: params.scheduleWatch,
    setTreeRoot: params.treeRoot,
    setTreeSelectedPath: params.treeSelectedPath,
    setTreeLoading: params.treeLoading,
    setExpandTreeNode: params.expandTreeNode,
    setBuildTreeRoot: params.buildTreeRoot,
    setSelectTreeNode: params.selectTreeNode,
    setToggleTreeNode: params.toggleTreeNode,
    setHandleTreeKey: params.handleTreeKey,
    setEntries: params.entries,
    setCurrentPath: params.currentPath,
    setPathInput: params.pathInput,
    setSelectedPaths: params.selectedPaths,
    setFocusedIndex: params.focusedIndex,
    setAnchorIndex: params.anchorIndex,
    setPathHistory: params.pathHistory,
    setLoading: params.loading,
    setError: params.error,
    setLoadDir: params.loadDir,
    setShowHidden: params.showHidden,
    setShowTree: params.showTree,
    setTheme: params.theme,
    setToggleHidden: params.toggleHidden,
    setToggleTree: params.toggleTree,
    setToggleTheme: params.toggleTheme,
    setSortMenuOpen: params.sortMenuOpen,
    setSortMenuIndex: params.sortMenuIndex,
    setSortKey: params.sortKey,
    setSortOrder: params.sortOrder,
    setSetSort: params.setSort,
    setOpenSortMenu: params.openSortMenu,
    setCloseSortMenu: params.closeSortMenu,
    setHandleSortMenuKey: params.handleSortMenuKey,
    setFilteredEntries: params.filteredEntries,
    setSearchError: params.searchError,
    setRecomputeSearch: params.recomputeSearch,
    setDropdownItems: params.dropdownItems,
    setStatusItems: params.statusItems,
    setDropdownIndex: params.dropdownIndex,
    setRecomputeDropdownItems: params.recomputeDropdownItems,
    setRecomputeStatusItems: params.recomputeStatusItems,
    setClampDropdownSelection: params.clampDropdownSelection,
  };
}
