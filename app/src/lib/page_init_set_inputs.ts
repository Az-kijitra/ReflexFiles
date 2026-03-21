// ── Types ─────────────────────────────────────────────────────────────────────

export interface PageInitSetInputsParams {
  // UI save / keymap
  uiSaveTimer:    (value: ReturnType<typeof setTimeout> | null) => void;
  saveUiStateNow: (value: () => Promise<void>) => void;
  scheduleUiSave: (value: () => void) => void;
  keymapCustom:   (value: Record<string, string[]>) => void;
  getDefaultBinding:  (value: (action: string) => string) => void;
  getCustomBinding:   (value: (action: string) => string) => void;
  getActionBindings:  (value: (action: string) => string[]) => void;
  matchesAction:      (value: (action: string, key: string) => boolean) => void;
  setCustomBinding:   (value: (action: string, binding: string) => void) => void;
  resetCustomBinding: (value: (action: string) => void) => void;
  captureBinding:     (value: (action: string) => void) => void;
  getMenuShortcut:    (value: (action: string) => string) => void;
  // List layout
  listRows:        (value: number) => void;
  listCols:        (value: number) => void;
  nameMaxChars:    (value: number) => void;
  visibleColStart: (value: number) => void;
  visibleColEnd:   (value: number) => void;
  overflowLeft:    (value: boolean) => void;
  overflowRight:   (value: boolean) => void;
  updateListRows:              (value: () => void) => void;
  updateOverflowMarkers:       (value: () => void) => void;
  updateVisibleColumns:        (value: () => void) => void;
  setScrollStartColumn:        (value: (start: number, rows?: number | null) => void) => void;
  ensureColumnVisible:         (value: (target: number, rows?: number | null) => void) => void;
  scrollListHorizontallyByColumns: (value: (delta: number) => void) => void;
  getActualColumnSpan:         (value: (el: HTMLElement | null) => number) => void;
  // Focus / tree
  treeFocusedIndex: (value: number) => void;
  focusList:    (value: () => void) => void;
  focusTree:    (value: () => void) => void;
  focusTreeTop: (value: () => void) => void;
  watchTimer:   (value: ReturnType<typeof setTimeout> | null) => void;
  scheduleWatch:(value: (path: string) => void) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  treeRoot:        (value: any) => void;
  treeSelectedPath:(value: string) => void;
  treeLoading:     (value: boolean) => void;
  expandTreeNode:  (value: (path: string, depth: number, autoExpand: boolean) => Promise<void>) => void;
  buildTreeRoot:   (value: (path: string) => Promise<void>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectTreeNode:  (value: (node: any, index: number) => void) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toggleTreeNode:  (value: (node: any, index: number, event?: MouseEvent) => void) => void;
  handleTreeKey:   (value: (event: KeyboardEvent) => unknown) => void;
  // Dir / navigation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entries:       (value: any[]) => void;
  currentPath:   (value: string) => void;
  pathInput:     (value: string) => void;
  selectedPaths: (value: string[]) => void;
  focusedIndex:  (value: number) => void;
  anchorIndex:   (value: number | null) => void;
  pathHistory:   (value: string[]) => void;
  loading:       (value: boolean) => void;
  error:         (value: string) => void;
  loadDir:       (value: (path: string) => Promise<void>) => void;
  // Display flags
  showHidden: (value: boolean) => void;
  showTree:   (value: boolean) => void;
  theme:      (value: string) => void;
  toggleHidden: (value: () => void) => void;
  toggleTree:   (value: () => void) => void;
  toggleTheme:  (value: () => void) => void;
  // Sort
  sortMenuOpen:  (value: boolean) => void;
  sortMenuIndex: (value: number) => void;
  sortKey:       (value: string) => void;
  sortOrder:     (value: string) => void;
  setSort:          (value: (key: string) => void) => void;
  openSortMenu:     (value: () => void) => void;
  closeSortMenu:    (value: () => void) => void;
  handleSortMenuKey:(value: (event: KeyboardEvent) => void) => void;
  // Search / derived
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredEntries: (value: any[]) => void;
  searchError:     (value: string) => void;
  recomputeSearch: (value: () => void) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dropdownItems:   (value: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statusItems:     (value: any[]) => void;
  dropdownIndex:   (value: number) => void;
  recomputeDropdownItems: (value: () => void) => void;
  recomputeStatusItems:   (value: () => void) => void;
  clampDropdownSelection: (value: () => void) => void;
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildPageInitSetInputs(params: PageInitSetInputsParams) {
  return {
    setUiSaveTimer:           params.uiSaveTimer,
    setSaveUiStateNow:        params.saveUiStateNow,
    setScheduleUiSave:        params.scheduleUiSave,
    setKeymapCustom:          params.keymapCustom,
    setGetDefaultBinding:     params.getDefaultBinding,
    setGetCustomBinding:      params.getCustomBinding,
    setGetActionBindings:     params.getActionBindings,
    setMatchesAction:         params.matchesAction,
    setSetCustomBinding:      params.setCustomBinding,
    setResetCustomBinding:    params.resetCustomBinding,
    setCaptureBinding:        params.captureBinding,
    setGetMenuShortcut:       params.getMenuShortcut,
    setListRows:              params.listRows,
    setListCols:              params.listCols,
    setNameMaxChars:          params.nameMaxChars,
    setVisibleColStart:       params.visibleColStart,
    setVisibleColEnd:         params.visibleColEnd,
    setOverflowLeft:          params.overflowLeft,
    setOverflowRight:         params.overflowRight,
    setUpdateListRows:        params.updateListRows,
    setUpdateOverflowMarkers: params.updateOverflowMarkers,
    setUpdateVisibleColumns:  params.updateVisibleColumns,
    setSetScrollStartColumn:  params.setScrollStartColumn,
    setEnsureColumnVisible:   params.ensureColumnVisible,
    setScrollListHorizontallyByColumns: params.scrollListHorizontallyByColumns,
    setGetActualColumnSpan:   params.getActualColumnSpan,
    setTreeFocusedIndex:      params.treeFocusedIndex,
    setFocusList:             params.focusList,
    setFocusTree:             params.focusTree,
    setFocusTreeTop:          params.focusTreeTop,
    setWatchTimer:            params.watchTimer,
    setScheduleWatch:         params.scheduleWatch,
    setTreeRoot:              params.treeRoot,
    setTreeSelectedPath:      params.treeSelectedPath,
    setTreeLoading:           params.treeLoading,
    setExpandTreeNode:        params.expandTreeNode,
    setBuildTreeRoot:         params.buildTreeRoot,
    setSelectTreeNode:        params.selectTreeNode,
    setToggleTreeNode:        params.toggleTreeNode,
    setHandleTreeKey:         params.handleTreeKey,
    setEntries:               params.entries,
    setCurrentPath:           params.currentPath,
    setPathInput:             params.pathInput,
    setSelectedPaths:         params.selectedPaths,
    setFocusedIndex:          params.focusedIndex,
    setAnchorIndex:           params.anchorIndex,
    setPathHistory:           params.pathHistory,
    setLoading:               params.loading,
    setError:                 params.error,
    setLoadDir:               params.loadDir,
    setShowHidden:            params.showHidden,
    setShowTree:              params.showTree,
    setTheme:                 params.theme,
    setToggleHidden:          params.toggleHidden,
    setToggleTree:            params.toggleTree,
    setToggleTheme:           params.toggleTheme,
    setSortMenuOpen:          params.sortMenuOpen,
    setSortMenuIndex:         params.sortMenuIndex,
    setSortKey:               params.sortKey,
    setSortOrder:             params.sortOrder,
    setSetSort:               params.setSort,
    setOpenSortMenu:          params.openSortMenu,
    setCloseSortMenu:         params.closeSortMenu,
    setHandleSortMenuKey:     params.handleSortMenuKey,
    setFilteredEntries:       params.filteredEntries,
    setSearchError:           params.searchError,
    setRecomputeSearch:       params.recomputeSearch,
    setDropdownItems:         params.dropdownItems,
    setStatusItems:           params.statusItems,
    setDropdownIndex:         params.dropdownIndex,
    setRecomputeDropdownItems:params.recomputeDropdownItems,
    setRecomputeStatusItems:  params.recomputeStatusItems,
    setClampDropdownSelection:params.clampDropdownSelection,
  };
}
