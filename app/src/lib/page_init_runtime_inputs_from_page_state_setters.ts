/**
 * @param {object} params
 * @param {Record<string, any>} params.actions
 * @param {object} params.keymapSetters
 */
export function buildInitRuntimeSettersFromPageState(params) {
  return {
    uiSave: {
      saveUiStateNow: (value) => {
        params.actions.saveUiStateNow = value;
      },
      scheduleUiSave: (value) => {
        params.actions.scheduleUiSave = value;
      },
    },
    keymap: {
      getDefaultBinding: params.keymapSetters.getDefaultBinding,
      getCustomBinding: params.keymapSetters.getCustomBinding,
      getActionBindings: params.keymapSetters.getActionBindings,
      matchesAction: (value) => {
        params.actions.matchesAction = value;
      },
      setCustomBinding: params.keymapSetters.setCustomBinding,
      resetCustomBinding: params.keymapSetters.resetCustomBinding,
      captureBinding: params.keymapSetters.captureBinding,
      getMenuShortcut: params.keymapSetters.getMenuShortcut,
    },
    listLayout: {
      updateListRows: (value) => {
        params.actions.updateListRows = value;
      },
      updateOverflowMarkers: (value) => {
        params.actions.updateOverflowMarkers = value;
      },
      updateVisibleColumns: (value) => {
        params.actions.updateVisibleColumns = value;
      },
      setScrollStartColumn: (value) => {
        params.actions.setScrollStartColumn = value;
      },
      ensureColumnVisible: (value) => {
        params.actions.ensureColumnVisible = value;
      },
      scrollListHorizontallyByColumns: (value) => {
        params.actions.scrollListHorizontallyByColumns = value;
      },
      getActualColumnSpan: (value) => {
        params.actions.getActualColumnSpan = value;
      },
    },
    focus: {
      focusList: (value) => {
        params.actions.focusList = value;
      },
      focusTree: (value) => {
        params.actions.focusTree = value;
      },
      focusTreeTop: (value) => {
        params.actions.focusTreeTop = value;
      },
    },
    watch: {
      scheduleWatch: (value) => {
        params.actions.scheduleWatch = value;
      },
    },
    tree: {
      expandTreeNode: (value) => {
        params.actions.expandTreeNode = value;
      },
      buildTreeRoot: (value) => {
        params.actions.buildTreeRoot = value;
      },
      selectTreeNode: (value) => {
        params.actions.selectTreeNode = value;
      },
      toggleTreeNode: (value) => {
        params.actions.toggleTreeNode = value;
      },
      handleTreeKey: (value) => {
        params.actions.handleTreeKey = value;
      },
    },
    dir: {
      loadDir: (value) => {
        params.actions.loadDir = value;
      },
    },
    flags: {
      toggleHidden: (value) => {
        params.actions.toggleHidden = value;
      },
      toggleTree: (value) => {
        params.actions.toggleTree = value;
      },
      toggleTheme: (value) => {
        params.actions.toggleTheme = value;
      },
    },
    sort: {
      setSort: (value) => {
        params.actions.setSort = value;
      },
      openSortMenu: (value) => {
        params.actions.openSortMenu = value;
      },
      closeSortMenu: (value) => {
        params.actions.closeSortMenu = value;
      },
      handleSortMenuKey: (value) => {
        params.actions.handleSortMenuKey = value;
      },
    },
    derived: {
      recomputeSearch: (value) => {
        params.actions.recomputeSearch = value;
      },
      recomputeDropdownItems: (value) => {
        params.actions.recomputeDropdownItems = value;
      },
      recomputeStatusItems: (value) => {
        params.actions.recomputeStatusItems = value;
      },
      clampDropdownSelection: (value) => {
        params.actions.clampDropdownSelection = value;
      },
    },
  };
}
