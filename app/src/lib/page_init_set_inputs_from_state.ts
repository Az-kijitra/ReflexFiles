import { buildPageInitSetInputs } from "./page_init_set_inputs";
import type { PageInitInputsFromStateParams } from "./page_init_inputs_from_state";

export function buildPageInitSetInputsFromState(params: PageInitInputsFromStateParams) {
  // s(field): setter that writes to state
  const s = (field) => (v) => { params.state[field] = v; };
  // d(key): setter that delegates to params.set[key]
  const d = (key) => (v) => params.set[key](v);

  return buildPageInitSetInputs({
    // ── UI save / keymap ──────────────────────────────────────────────────
    uiSaveTimer:    d("uiSaveTimer"),
    saveUiStateNow: d("saveUiStateNow"),
    scheduleUiSave: d("scheduleUiSave"),
    keymapCustom:   s("keymapCustom"),
    getDefaultBinding:  d("getDefaultBinding"),
    getCustomBinding:   d("getCustomBinding"),
    getActionBindings:  d("getActionBindings"),
    matchesAction:      d("matchesAction"),
    setCustomBinding:   d("setCustomBinding"),
    resetCustomBinding: d("resetCustomBinding"),
    captureBinding:     d("captureBinding"),
    getMenuShortcut:    d("getMenuShortcut"),
    // ── List layout ───────────────────────────────────────────────────────
    listRows:     s("listRows"),
    listCols:     s("listCols"),
    nameMaxChars: s("nameMaxChars"),
    visibleColStart: s("visibleColStart"),
    visibleColEnd:   s("visibleColEnd"),
    overflowLeft:    s("overflowLeft"),
    overflowRight:   s("overflowRight"),
    updateListRows:              d("updateListRows"),
    updateOverflowMarkers:       d("updateOverflowMarkers"),
    updateVisibleColumns:        d("updateVisibleColumns"),
    setScrollStartColumn:        d("setScrollStartColumn"),
    ensureColumnVisible:         d("ensureColumnVisible"),
    scrollListHorizontallyByColumns: d("scrollListHorizontallyByColumns"),
    getActualColumnSpan:         d("getActualColumnSpan"),
    // ── Focus / tree ──────────────────────────────────────────────────────
    treeFocusedIndex: s("treeFocusedIndex"),
    focusList:    d("focusList"),
    focusTree:    d("focusTree"),
    focusTreeTop: d("focusTreeTop"),
    watchTimer:   d("watchTimer"),
    scheduleWatch:d("scheduleWatch"),
    treeRoot:        s("treeRoot"),
    treeSelectedPath:s("treeSelectedPath"),
    treeLoading:     s("treeLoading"),
    expandTreeNode:  d("expandTreeNode"),
    buildTreeRoot:   d("buildTreeRoot"),
    selectTreeNode:  d("selectTreeNode"),
    toggleTreeNode:  d("toggleTreeNode"),
    handleTreeKey:   d("handleTreeKey"),
    // ── Dir / navigation ─────────────────────────────────────────────────
    entries:      s("entries"),
    currentPath:  s("currentPath"),
    pathInput:    s("pathInput"),
    selectedPaths:s("selectedPaths"),
    focusedIndex: s("focusedIndex"),
    anchorIndex:  s("anchorIndex"),
    pathHistory:  s("pathHistory"),
    loading:      s("loading"),
    error:        s("error"),
    loadDir:      d("loadDir"),
    // ── Display flags ─────────────────────────────────────────────────────
    showHidden: s("showHidden"),
    showTree:   s("showTree"),
    theme:      (v) => { params.state.ui_theme = v; }, // state field name differs
    toggleHidden: d("toggleHidden"),
    toggleTree:   d("toggleTree"),
    toggleTheme:  d("toggleTheme"),
    // ── Sort ─────────────────────────────────────────────────────────────
    sortMenuOpen:  s("sortMenuOpen"),
    sortMenuIndex: s("sortMenuIndex"),
    sortKey:       s("sortKey"),
    sortOrder:     s("sortOrder"),
    setSort:          d("setSort"),
    openSortMenu:     d("openSortMenu"),
    closeSortMenu:    d("closeSortMenu"),
    handleSortMenuKey:d("handleSortMenuKey"),
    // ── Search / derived ─────────────────────────────────────────────────
    filteredEntries: s("filteredEntries"),
    searchError:     s("searchError"),
    recomputeSearch: d("recomputeSearch"),
    dropdownItems:   s("dropdownItems"),
    statusItems:     s("statusItems"),
    dropdownIndex:   s("dropdownIndex"),
    recomputeDropdownItems: d("recomputeDropdownItems"),
    recomputeStatusItems:   d("recomputeStatusItems"),
    clampDropdownSelection: d("clampDropdownSelection"),
  });
}
