import { buildPageInitStateInputs } from "./page_init_state_inputs";

/**
 * @param {object} params
 * @param {any} params.state
 * @param {object | (() => object)} params.refs
 * @param {object} params.get
 * @param {object} params.values
 */
export function buildPageInitStateInputsFromState(params) {
  const getRefs = typeof params.refs === "function" ? params.refs : () => params.refs;
  const readRef = (key) => () => getRefs()[key];

  return buildPageInitStateInputs({
    uiConfigLoaded: () => params.state.uiConfigLoaded,
    currentPath: () => params.state.currentPath,
    windowBounds: () => params.state.windowBounds,
    windowBoundsReady: () => params.state.windowBoundsReady,
    showHidden: () => params.state.showHidden,
    showSize: () => params.state.showSize,
    showTime: () => params.state.showTime,
    showTree: () => params.state.showTree,
    sortKey: () => params.state.sortKey,
    sortOrder: () => params.state.sortOrder,
    pathHistory: () => params.state.pathHistory,
    jumpList: () => params.state.jumpList,
    searchHistory: () => params.state.searchHistory,
    theme: () => params.state.ui_theme,
    uiSaveTimer: () => params.get.uiSaveTimer(),
    keymapProfile: () => params.state.keymapProfile,
    keymapCustom: () => params.state.keymapCustom,
    listEl: readRef("listEl"),
    listBodyEl: readRef("listBodyEl"),
    listCols: () => params.state.listCols,
    listRows: () => params.state.listRows,
    visibleColStart: () => params.state.visibleColStart,
    visibleColEnd: () => params.state.visibleColEnd,
    filteredCount: () => params.state.filteredEntries.length,
    treeEl: readRef("treeEl"),
    treeBodyEl: readRef("treeBodyEl"),
    treeFocusedIndex: () => params.state.treeFocusedIndex,
    treeRoot: () => params.state.treeRoot,
    watchTimer: () => params.get.watchTimer(),
    treeBodyElSafe: readRef("treeBodyEl"),
    treeFocusedIndexSafe: () => params.state.treeFocusedIndex,
    treeElSafe: readRef("treeEl"),
    treeRootSafe: () => params.state.treeRoot,
    loadDir: () => params.get.loadDir(),
    entries: () => params.state.entries,
    searchActive: () => params.state.searchActive,
    searchQuery: () => params.state.searchQuery,
    searchRegex: () => params.state.searchRegex,
    dropdownMode: () => params.state.dropdownMode,
    dropdownOpen: () => params.state.dropdownOpen,
    dropdownIndex: () => params.state.dropdownIndex,
    dropdownItems: () => params.state.dropdownItems,
    selectedCount: () => params.state.selectedPaths.length,
    statusMessage: () => params.state.statusMessage,
    showError: () => params.values.showError,
    focusList: () => params.get.focusList(),
    buildTreeRoot: () => params.get.buildTreeRoot(),
    updateListRows: () => params.get.updateListRows(),
    sortMenuOpen: () => params.state.sortMenuOpen,
    sortMenuIndex: () => params.state.sortMenuIndex,
    sortMenuEl: readRef("sortMenuEl"),
    scheduleUiSave: () => params.get.scheduleUiSave(),
    scheduleWatch: () => params.get.scheduleWatch(),
  });
}
