/**
 * @param {{
 *   refs: () => any;
 *   timers: {
 *     get: {
 *       uiSaveTimer: () => ReturnType<typeof setTimeout> | null;
 *       watchTimer: () => ReturnType<typeof setTimeout> | null;
 *     };
 *     set: {
 *       uiSaveTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *       watchTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     };
 *   };
 *   actions: {
 *     loadDir: () => (path: string) => Promise<void>;
 *     focusList: () => () => void;
 *     buildTreeRoot: () => (path: string) => Promise<void>;
 *     updateListRows: () => () => void;
 *     scheduleUiSave: () => () => void;
 *     scheduleWatch: () => (path: string) => void;
 *   };
 *   uiSave: {
 *     saveUiStateNow: (value: () => Promise<void>) => void;
 *     scheduleUiSave: (value: () => void) => void;
 *   };
 *   keymap: {
 *     getDefaultBinding: (value: () => string) => void;
 *     getCustomBinding: (value: () => string) => void;
 *     getActionBindings: (value: () => any[]) => void;
 *     matchesAction: (value: (action: string, key: string) => boolean) => void;
 *     setCustomBinding: (value: (action: string, binding: string) => void) => void;
 *     resetCustomBinding: (value: (action: string) => void) => void;
 *     captureBinding: (value: (action: string) => void) => void;
 *     getMenuShortcut: (value: (action: string) => string) => void;
 *   };
 *   listLayout: Record<string, (value: any) => void>;
 *   focus: Record<string, (value: any) => void>;
 *   watch: Record<string, (value: any) => void>;
 *   tree: Record<string, (value: any) => void>;
 *   dir: Record<string, (value: any) => void>;
 *   flags: Record<string, (value: any) => void>;
 *   sort: Record<string, (value: any) => void>;
 *   derived: Record<string, (value: any) => void>;
 *   values: any;
 * }} params
 */
export function buildInitPageRuntimeInputsFromState(params) {
  return {
    refs: params.refs,
    get: buildGet({ timers: params.timers.get, actions: params.actions }),
    set: buildSet({
      timers:     params.timers.set,
      uiSave:     params.uiSave,
      keymap:     params.keymap,
      listLayout: params.listLayout,
      focus:      params.focus,
      watch:      params.watch,
      tree:       params.tree,
      dir:        params.dir,
      flags:      params.flags,
      sort:       params.sort,
      derived:    params.derived,
    }),
    values: buildValues(params.values),
  };
}

// ── Get context ───────────────────────────────────────────────────────────────

function buildGet(params) {
  return {
    uiSaveTimer:   params.timers.uiSaveTimer,
    watchTimer:    params.timers.watchTimer,
    loadDir:       params.actions.loadDir,
    focusList:     params.actions.focusList,
    buildTreeRoot: params.actions.buildTreeRoot,
    updateListRows:params.actions.updateListRows,
    scheduleUiSave:params.actions.scheduleUiSave,
    scheduleWatch: params.actions.scheduleWatch,
  };
}

// ── Set context ───────────────────────────────────────────────────────────────

function buildSet(params) {
  return {
    uiSaveTimer:    params.timers.uiSaveTimer,
    saveUiStateNow: params.uiSave.saveUiStateNow,
    scheduleUiSave: params.uiSave.scheduleUiSave,
    getDefaultBinding:  params.keymap.getDefaultBinding,
    getCustomBinding:   params.keymap.getCustomBinding,
    getActionBindings:  params.keymap.getActionBindings,
    matchesAction:      params.keymap.matchesAction,
    setCustomBinding:   params.keymap.setCustomBinding,
    resetCustomBinding: params.keymap.resetCustomBinding,
    captureBinding:     params.keymap.captureBinding,
    getMenuShortcut:    params.keymap.getMenuShortcut,
    updateListRows:     params.listLayout.updateListRows,
    updateOverflowMarkers: params.listLayout.updateOverflowMarkers,
    updateVisibleColumns:  params.listLayout.updateVisibleColumns,
    setScrollStartColumn:  params.listLayout.setScrollStartColumn,
    ensureColumnVisible:   params.listLayout.ensureColumnVisible,
    scrollListHorizontallyByColumns: params.listLayout.scrollListHorizontallyByColumns,
    getActualColumnSpan:   params.listLayout.getActualColumnSpan,
    focusList:    params.focus.focusList,
    focusTree:    params.focus.focusTree,
    focusTreeTop: params.focus.focusTreeTop,
    watchTimer:   params.timers.watchTimer,
    scheduleWatch:  params.watch.scheduleWatch,
    expandTreeNode: params.tree.expandTreeNode,
    buildTreeRoot:  params.tree.buildTreeRoot,
    selectTreeNode: params.tree.selectTreeNode,
    toggleTreeNode: params.tree.toggleTreeNode,
    handleTreeKey:  params.tree.handleTreeKey,
    loadDir:        params.dir.loadDir,
    toggleHidden:   params.flags.toggleHidden,
    toggleTree:     params.flags.toggleTree,
    toggleTheme:    params.flags.toggleTheme,
    setSort:          params.sort.setSort,
    openSortMenu:     params.sort.openSortMenu,
    closeSortMenu:    params.sort.closeSortMenu,
    handleSortMenuKey:params.sort.handleSortMenuKey,
    recomputeSearch:        params.derived.recomputeSearch,
    recomputeDropdownItems: params.derived.recomputeDropdownItems,
    recomputeStatusItems:   params.derived.recomputeStatusItems,
    clampDropdownSelection: params.derived.clampDropdownSelection,
  };
}

// ── Values context ────────────────────────────────────────────────────────────

function buildValues(params) {
  return {
    t:               params.i18n.t,
    matchesAction:   params.keymap.matchesAction,
    showError:       params.error.showError,
    clearTree:       params.tree.clearTree,
    loadCurrentDir:  params.dir.loadCurrentDir,
    selectedCount:   params.selection.selectedCount,
    dropdownItemsSafe: params.dropdown.dropdownItemsSafe,
  };
}
