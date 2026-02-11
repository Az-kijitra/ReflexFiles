/**
 * @param {{
 *   timers: {
 *     uiSaveTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     watchTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *   };
 *   uiSave: {
 *     saveUiStateNow: (value: () => Promise<void>) => void;
 *     scheduleUiSave: (value: () => void) => void;
 *   };
 *   keymap: {
 *     getDefaultBinding: (value: () => string) => void;
 *     getCustomBinding: (value: () => string) => void;
 *     getActionBindings: (value: () => any[]) => void;
 *     matchesAction: (value: () => boolean) => void;
 *     setCustomBinding: (value: () => void) => void;
 *     resetCustomBinding: (value: () => void) => void;
 *     captureBinding: (value: () => void) => void;
 *     getMenuShortcut: (value: () => string) => void;
 *   };
 *   listLayout: {
 *     updateListRows: (value: () => void) => void;
 *     updateOverflowMarkers: (value: () => void) => void;
 *     updateVisibleColumns: (value: () => void) => void;
 *     setScrollStartColumn: (value: (startCol: number, rowsOverride?: number | null) => void) => void;
 *     ensureColumnVisible: (value: (targetCol: number, rowsOverride?: number | null) => void) => void;
 *     scrollListHorizontallyByColumns: (value: (deltaColumns: number) => void) => void;
 *     getActualColumnSpan: (value: (el: HTMLElement | null) => number) => void;
 *   };
 *   focus: {
 *     focusList: (value: () => void) => void;
 *     focusTree: (value: () => void) => void;
 *     focusTreeTop: (value: () => void) => void;
 *   };
 *   watch: {
 *     scheduleWatch: (value: (path: string) => void) => void;
 *   };
 *   tree: {
 *     expandTreeNode: (value: (path: string, depth: number, autoExpand: boolean) => Promise<void>) => void;
 *     buildTreeRoot: (value: (path: string) => Promise<void>) => void;
 *     selectTreeNode: (value: (node: any, index: number) => void) => void;
 *     toggleTreeNode: (value: (node: any, index: number, event?: MouseEvent) => void) => void;
 *     handleTreeKey: (value: (event: KeyboardEvent) => unknown) => void;
 *   };
 *   dir: {
 *     loadDir: (value: (path: string) => Promise<void>) => void;
 *   };
 *   flags: {
 *     toggleHidden: (value: () => void) => void;
 *     toggleTree: (value: () => void) => void;
 *     toggleTheme: (value: () => void) => void;
 *   };
 *   sort: {
 *     setSort: (value: (nextKey: string) => void) => void;
 *     openSortMenu: (value: () => void) => void;
 *     closeSortMenu: (value: () => void) => void;
 *     handleSortMenuKey: (value: (event: KeyboardEvent) => void) => void;
 *   };
 *   derived: {
 *     recomputeSearch: (value: () => void) => void;
 *     recomputeDropdownItems: (value: () => void) => void;
 *     recomputeStatusItems: (value: () => void) => void;
 *     clampDropdownSelection: (value: () => void) => void;
 *   };
 * }} params
 */
export function buildInitPageSet(params) {
  return {
    uiSaveTimer: params.timers.uiSaveTimer,
    saveUiStateNow: params.uiSave.saveUiStateNow,
    scheduleUiSave: params.uiSave.scheduleUiSave,
    getDefaultBinding: params.keymap.getDefaultBinding,
    getCustomBinding: params.keymap.getCustomBinding,
    getActionBindings: params.keymap.getActionBindings,
    matchesAction: params.keymap.matchesAction,
    setCustomBinding: params.keymap.setCustomBinding,
    resetCustomBinding: params.keymap.resetCustomBinding,
    captureBinding: params.keymap.captureBinding,
    getMenuShortcut: params.keymap.getMenuShortcut,
    updateListRows: params.listLayout.updateListRows,
    updateOverflowMarkers: params.listLayout.updateOverflowMarkers,
    updateVisibleColumns: params.listLayout.updateVisibleColumns,
    setScrollStartColumn: params.listLayout.setScrollStartColumn,
    ensureColumnVisible: params.listLayout.ensureColumnVisible,
    scrollListHorizontallyByColumns: params.listLayout.scrollListHorizontallyByColumns,
    getActualColumnSpan: params.listLayout.getActualColumnSpan,
    focusList: params.focus.focusList,
    focusTree: params.focus.focusTree,
    focusTreeTop: params.focus.focusTreeTop,
    watchTimer: params.timers.watchTimer,
    scheduleWatch: params.watch.scheduleWatch,
    expandTreeNode: params.tree.expandTreeNode,
    buildTreeRoot: params.tree.buildTreeRoot,
    selectTreeNode: params.tree.selectTreeNode,
    toggleTreeNode: params.tree.toggleTreeNode,
    handleTreeKey: params.tree.handleTreeKey,
    loadDir: params.dir.loadDir,
    toggleHidden: params.flags.toggleHidden,
    toggleTree: params.flags.toggleTree,
    toggleTheme: params.flags.toggleTheme,
    setSort: params.sort.setSort,
    openSortMenu: params.sort.openSortMenu,
    closeSortMenu: params.sort.closeSortMenu,
    handleSortMenuKey: params.sort.handleSortMenuKey,
    recomputeSearch: params.derived.recomputeSearch,
    recomputeDropdownItems: params.derived.recomputeDropdownItems,
    recomputeStatusItems: params.derived.recomputeStatusItems,
    clampDropdownSelection: params.derived.clampDropdownSelection,
  };
}
