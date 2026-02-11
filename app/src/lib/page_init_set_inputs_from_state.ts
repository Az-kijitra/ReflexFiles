import { buildPageInitSetInputs } from "./page_init_set_inputs";

/**
 * @param {object} params
 * @param {any} params.state
 * @param {object} params.set
 */
export function buildPageInitSetInputsFromState(params) {
  return buildPageInitSetInputs({
    uiSaveTimer: (value) => {
      params.set.uiSaveTimer(value);
    },
    saveUiStateNow: (value) => {
      params.set.saveUiStateNow(value);
    },
    scheduleUiSave: (value) => {
      params.set.scheduleUiSave(value);
    },
    keymapCustom: (value) => {
      params.state.keymapCustom = value;
    },
    getDefaultBinding: (value) => {
      params.set.getDefaultBinding(value);
    },
    getCustomBinding: (value) => {
      params.set.getCustomBinding(value);
    },
    getActionBindings: (value) => {
      params.set.getActionBindings(value);
    },
    matchesAction: (value) => {
      params.set.matchesAction(value);
    },
    setCustomBinding: (value) => {
      params.set.setCustomBinding(value);
    },
    resetCustomBinding: (value) => {
      params.set.resetCustomBinding(value);
    },
    captureBinding: (value) => {
      params.set.captureBinding(value);
    },
    getMenuShortcut: (value) => {
      params.set.getMenuShortcut(value);
    },
    listRows: (value) => {
      params.state.listRows = value;
    },
    listCols: (value) => {
      params.state.listCols = value;
    },
    nameMaxChars: (value) => {
      params.state.nameMaxChars = value;
    },
    visibleColStart: (value) => {
      params.state.visibleColStart = value;
    },
    visibleColEnd: (value) => {
      params.state.visibleColEnd = value;
    },
    overflowLeft: (value) => {
      params.state.overflowLeft = value;
    },
    overflowRight: (value) => {
      params.state.overflowRight = value;
    },
    updateListRows: (value) => {
      params.set.updateListRows(value);
    },
    updateOverflowMarkers: (value) => {
      params.set.updateOverflowMarkers(value);
    },
    updateVisibleColumns: (value) => {
      params.set.updateVisibleColumns(value);
    },
    setScrollStartColumn: (value) => {
      params.set.setScrollStartColumn(value);
    },
    ensureColumnVisible: (value) => {
      params.set.ensureColumnVisible(value);
    },
    scrollListHorizontallyByColumns: (value) => {
      params.set.scrollListHorizontallyByColumns(value);
    },
    getActualColumnSpan: (value) => {
      params.set.getActualColumnSpan(value);
    },
    treeFocusedIndex: (value) => {
      params.state.treeFocusedIndex = value;
    },
    focusList: (value) => {
      params.set.focusList(value);
    },
    focusTree: (value) => {
      params.set.focusTree(value);
    },
    focusTreeTop: (value) => {
      params.set.focusTreeTop(value);
    },
    watchTimer: (value) => {
      params.set.watchTimer(value);
    },
    scheduleWatch: (value) => {
      params.set.scheduleWatch(value);
    },
    treeRoot: (value) => {
      params.state.treeRoot = value;
    },
    treeSelectedPath: (value) => {
      params.state.treeSelectedPath = value;
    },
    treeLoading: (value) => {
      params.state.treeLoading = value;
    },
    expandTreeNode: (value) => {
      params.set.expandTreeNode(value);
    },
    buildTreeRoot: (value) => {
      params.set.buildTreeRoot(value);
    },
    selectTreeNode: (value) => {
      params.set.selectTreeNode(value);
    },
    toggleTreeNode: (value) => {
      params.set.toggleTreeNode(value);
    },
    handleTreeKey: (value) => {
      params.set.handleTreeKey(value);
    },
    entries: (value) => {
      params.state.entries = value;
    },
    currentPath: (value) => {
      params.state.currentPath = value;
    },
    pathInput: (value) => {
      params.state.pathInput = value;
    },
    selectedPaths: (value) => {
      params.state.selectedPaths = value;
    },
    focusedIndex: (value) => {
      params.state.focusedIndex = value;
    },
    anchorIndex: (value) => {
      params.state.anchorIndex = value;
    },
    pathHistory: (value) => {
      params.state.pathHistory = value;
    },
    loading: (value) => {
      params.state.loading = value;
    },
    error: (value) => {
      params.state.error = value;
    },
    loadDir: (value) => {
      params.set.loadDir(value);
    },
    showHidden: (value) => {
      params.state.showHidden = value;
    },
    showTree: (value) => {
      params.state.showTree = value;
    },
    theme: (value) => {
      params.state.ui_theme = value;
    },
    toggleHidden: (value) => {
      params.set.toggleHidden(value);
    },
    toggleTree: (value) => {
      params.set.toggleTree(value);
    },
    toggleTheme: (value) => {
      params.set.toggleTheme(value);
    },
    sortMenuOpen: (value) => {
      params.state.sortMenuOpen = value;
    },
    sortMenuIndex: (value) => {
      params.state.sortMenuIndex = value;
    },
    sortKey: (value) => {
      params.state.sortKey = value;
    },
    sortOrder: (value) => {
      params.state.sortOrder = value;
    },
    setSort: (value) => {
      params.set.setSort(value);
    },
    openSortMenu: (value) => {
      params.set.openSortMenu(value);
    },
    closeSortMenu: (value) => {
      params.set.closeSortMenu(value);
    },
    handleSortMenuKey: (value) => {
      params.set.handleSortMenuKey(value);
    },
    filteredEntries: (value) => {
      params.state.filteredEntries = value;
    },
    searchError: (value) => {
      params.state.searchError = value;
    },
    recomputeSearch: (value) => {
      params.set.recomputeSearch(value);
    },
    dropdownItems: (value) => {
      params.state.dropdownItems = value;
    },
    statusItems: (value) => {
      params.state.statusItems = value;
    },
    dropdownIndex: (value) => {
      params.state.dropdownIndex = value;
    },
    recomputeDropdownItems: (value) => {
      params.set.recomputeDropdownItems(value);
    },
    recomputeStatusItems: (value) => {
      params.set.recomputeStatusItems(value);
    },
    clampDropdownSelection: (value) => {
      params.set.clampDropdownSelection(value);
    },
  });
}
