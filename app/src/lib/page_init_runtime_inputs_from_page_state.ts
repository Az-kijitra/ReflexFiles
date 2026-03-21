import { buildInitPageRuntimeInputsFromState } from "./page_init_runtime_inputs_from_state";

/**
 * @param {{
 *   state: any;
 *   shellRefs: {
 *     listEl: HTMLElement | null;
 *     listBodyEl: HTMLElement | null;
 *     treeEl: HTMLElement | null;
 *     treeBodyEl: HTMLElement | null;
 *   };
 *   overlayRefs: { sortMenuEl: HTMLElement | null };
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
 *   actions: Record<string, any>;
 *   keymapSetters: {
 *     getDefaultBinding: (value: () => string) => void;
 *     getCustomBinding: (value: () => string) => void;
 *     getActionBindings: (value: () => any[]) => void;
 *     setCustomBinding: (value: (action: string, binding: string) => void) => void;
 *     resetCustomBinding: (value: (action: string) => void) => void;
 *     captureBinding: (value: (action: string) => void) => void;
 *     getMenuShortcut: (value: (action: string) => string) => void;
 *   };
 *   t: (key: string, params?: Record<string, string | number>) => string;
 *   showError: (err: unknown) => void;
 * }} params
 */
export function buildInitPageRuntimeInputsFromPageState(params) {
  const setters = buildSettersFromPageState(params);

  return buildInitPageRuntimeInputsFromState({
    refs: buildRefsFromPageState(params),
    timers: params.timers,
    actions: buildActionsFromPageState(params),
    uiSave:     setters.uiSave,
    keymap:     setters.keymap,
    listLayout: setters.listLayout,
    focus:      setters.focus,
    watch:      setters.watch,
    tree:       setters.tree,
    dir:        setters.dir,
    flags:      setters.flags,
    sort:       setters.sort,
    derived:    setters.derived,
    values:     buildValuesFromPageState(params),
  });
}

// ── Refs ─────────────────────────────────────────────────────────────────────

function buildRefsFromPageState(params) {
  return () => ({
    listEl:    params.shellRefs.listEl,
    listBodyEl:params.shellRefs.listBodyEl,
    treeEl:    params.shellRefs.treeEl,
    treeBodyEl:params.shellRefs.treeBodyEl,
    sortMenuEl:params.overlayRefs.sortMenuEl,
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

function buildActionsFromPageState(params) {
  return {
    loadDir:       () => params.actions.loadDir,
    focusList:     () => params.actions.focusList,
    buildTreeRoot: () => params.actions.buildTreeRoot,
    updateListRows:() => params.actions.updateListRows,
    scheduleUiSave:() => params.actions.scheduleUiSave,
    scheduleWatch: () => params.actions.scheduleWatch,
  };
}

// ── Values ────────────────────────────────────────────────────────────────────

function buildValuesFromPageState(params) {
  return {
    i18n:   { t: params.t },
    keymap: { matchesAction: (...args) => params.actions.matchesAction(...args) },
    error:  { showError: params.showError },
    tree: {
      clearTree: () => {
        params.state.treeRoot = null;
        params.state.treeSelectedPath = "";
        params.state.treeFocusedIndex = 0;
      },
    },
    dir:      { loadCurrentDir: () => params.actions.loadDir(params.state.currentPath) },
    selection:{ selectedCount: () => params.state.selectedPaths.length },
    dropdown: { dropdownItemsSafe: () => params.state.dropdownItems },
  };
}

// ── Setters ───────────────────────────────────────────────────────────────────

function buildSettersFromPageState(params) {
  // Shorthand: wire an action slot to a setter
  const a = (key) => (value) => { params.actions[key] = value; };

  return {
    uiSave: {
      saveUiStateNow: a("saveUiStateNow"),
      scheduleUiSave: a("scheduleUiSave"),
    },
    keymap: {
      getDefaultBinding:  params.keymapSetters.getDefaultBinding,
      getCustomBinding:   params.keymapSetters.getCustomBinding,
      getActionBindings:  params.keymapSetters.getActionBindings,
      matchesAction:      a("matchesAction"),
      setCustomBinding:   params.keymapSetters.setCustomBinding,
      resetCustomBinding: params.keymapSetters.resetCustomBinding,
      captureBinding:     params.keymapSetters.captureBinding,
      getMenuShortcut:    params.keymapSetters.getMenuShortcut,
    },
    listLayout: {
      updateListRows:              a("updateListRows"),
      updateOverflowMarkers:       a("updateOverflowMarkers"),
      updateVisibleColumns:        a("updateVisibleColumns"),
      setScrollStartColumn:        a("setScrollStartColumn"),
      ensureColumnVisible:         a("ensureColumnVisible"),
      scrollListHorizontallyByColumns: a("scrollListHorizontallyByColumns"),
      getActualColumnSpan:         a("getActualColumnSpan"),
    },
    focus: {
      focusList: a("focusList"),
      focusTree: a("focusTree"),
      focusTreeTop: a("focusTreeTop"),
    },
    watch: {
      scheduleWatch: a("scheduleWatch"),
    },
    tree: {
      expandTreeNode: a("expandTreeNode"),
      buildTreeRoot:  a("buildTreeRoot"),
      selectTreeNode: a("selectTreeNode"),
      toggleTreeNode: a("toggleTreeNode"),
      handleTreeKey:  a("handleTreeKey"),
    },
    dir: {
      loadDir: a("loadDir"),
    },
    flags: {
      toggleHidden: a("toggleHidden"),
      toggleTree:   a("toggleTree"),
      toggleTheme:  a("toggleTheme"),
    },
    sort: {
      setSort:         a("setSort"),
      openSortMenu:    a("openSortMenu"),
      closeSortMenu:   a("closeSortMenu"),
      handleSortMenuKey: a("handleSortMenuKey"),
    },
    derived: {
      recomputeSearch:        a("recomputeSearch"),
      recomputeDropdownItems: a("recomputeDropdownItems"),
      recomputeStatusItems:   a("recomputeStatusItems"),
      clampDropdownSelection: a("clampDropdownSelection"),
    },
  };
}
