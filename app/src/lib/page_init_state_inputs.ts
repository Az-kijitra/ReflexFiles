// ── Types ─────────────────────────────────────────────────────────────────────

export interface PageInitStateInputsParams {
  uiConfigLoaded:     () => boolean;
  currentPath:        () => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  windowBounds:       () => any;
  windowBoundsReady:  () => boolean;
  showHidden:         () => boolean;
  showSize:           () => boolean;
  showTime:           () => boolean;
  showTree:           () => boolean;
  sortKey:            () => string;
  sortOrder:          () => string;
  pathHistory:        () => string[];
  jumpList:           () => string[];
  searchHistory:      () => string[];
  theme:              () => string;
  uiSaveTimer:        () => ReturnType<typeof setTimeout> | null;
  keymapProfile:      () => string;
  keymapCustom:       () => Record<string, string[]>;
  listEl:             () => HTMLElement | null;
  listBodyEl:         () => HTMLElement | null;
  listCols:           () => number;
  listRows:           () => number;
  visibleColStart:    () => number;
  visibleColEnd:      () => number;
  filteredCount:      () => number;
  treeEl:             () => HTMLElement | null;
  treeBodyEl:         () => HTMLElement | null;
  treeFocusedIndex:   () => number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  treeRoot:           () => any;
  watchTimer:         () => ReturnType<typeof setTimeout> | null;
  treeBodyElSafe:     () => HTMLElement | null;
  treeFocusedIndexSafe: () => number;
  treeElSafe:         () => HTMLElement | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  treeRootSafe:       () => any;
  loadDir:            () => (path: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entries:            () => any[];
  searchActive:       () => boolean;
  searchQuery:        () => string;
  searchRegex:        () => boolean;
  dropdownMode:       () => string;
  dropdownOpen:       () => boolean;
  dropdownIndex:      () => number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dropdownItems:      () => any[];
  selectedCount:      () => number;
  statusMessage:      () => string;
  showError:          () => (err: unknown) => void;
  focusList:          () => () => void;
  buildTreeRoot:      () => (path: string) => Promise<void>;
  updateListRows:     () => () => void;
  sortMenuOpen:       () => boolean;
  sortMenuIndex:      () => number;
  sortMenuEl:         () => HTMLElement | null;
  scheduleUiSave:     () => () => void;
  scheduleWatch:      () => (path: string) => void;
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildPageInitStateInputs(params: PageInitStateInputsParams) {
  return {
    getUiConfigLoaded:       params.uiConfigLoaded,
    getCurrentPath:          params.currentPath,
    getWindowBounds:         params.windowBounds,
    getWindowBoundsReady:    params.windowBoundsReady,
    getShowHidden:           params.showHidden,
    getShowSize:             params.showSize,
    getShowTime:             params.showTime,
    getShowTree:             params.showTree,
    getSortKey:              params.sortKey,
    getSortOrder:            params.sortOrder,
    getPathHistory:          params.pathHistory,
    getJumpList:             params.jumpList,
    getSearchHistory:        params.searchHistory,
    getTheme:                params.theme,
    getUiSaveTimer:          params.uiSaveTimer,
    getKeymapProfile:        params.keymapProfile,
    getKeymapCustom:         params.keymapCustom,
    getListEl:               params.listEl,
    getListBodyEl:           params.listBodyEl,
    getListCols:             params.listCols,
    getListRows:             params.listRows,
    getVisibleColStart:      params.visibleColStart,
    getVisibleColEnd:        params.visibleColEnd,
    getFilteredCount:        params.filteredCount,
    getTreeEl:               params.treeEl,
    getTreeBodyEl:           params.treeBodyEl,
    getTreeFocusedIndex:     params.treeFocusedIndex,
    getTreeRoot:             params.treeRoot,
    getWatchTimer:           params.watchTimer,
    getTreeBodyElSafe:       params.treeBodyElSafe,
    getTreeFocusedIndexSafe: params.treeFocusedIndexSafe,
    getTreeElSafe:           params.treeElSafe,
    getTreeRootSafe:         params.treeRootSafe,
    getLoadDir:              params.loadDir,
    getEntries:              params.entries,
    getSearchActive:         params.searchActive,
    getSearchQuery:          params.searchQuery,
    getSearchRegex:          params.searchRegex,
    getDropdownMode:         params.dropdownMode,
    getDropdownOpen:         params.dropdownOpen,
    getDropdownIndex:        params.dropdownIndex,
    getDropdownItems:        params.dropdownItems,
    getSelectedCount:        params.selectedCount,
    getStatusMessage:        params.statusMessage,
    getShowError:            params.showError,
    getFocusList:            params.focusList,
    getBuildTreeRoot:        params.buildTreeRoot,
    getUpdateListRows:       params.updateListRows,
    getSortMenuOpen:         params.sortMenuOpen,
    getSortMenuIndex:        params.sortMenuIndex,
    getSortMenuEl:           params.sortMenuEl,
    getScheduleUiSave:       params.scheduleUiSave,
    getScheduleWatch:        params.scheduleWatch,
  };
}
