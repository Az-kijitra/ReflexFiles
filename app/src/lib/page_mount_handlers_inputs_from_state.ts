// ── Types ─────────────────────────────────────────────────────────────────────

interface MountHandlersFromStateParams {
  actions: {
    matchesAction: (action: string, key: string) => boolean;
    handleSortMenuKey: (event: KeyboardEvent) => void;
    focusTreeTop: () => void;
    focusList: () => void;
    moveFocusByRow: (delta: number, extend?: boolean) => void;
    moveFocusByColumn: (delta: number) => void;
    handleTreeKey: (event: KeyboardEvent) => unknown;
    buildTreeRoot: (path: string) => Promise<void>;
    openSortMenu: () => void;
    closeSortMenu: () => void;
    closeMenu: () => void;
    updateListRows: () => void;
    scheduleUiSave: () => void;
    loadDir: (path: string) => Promise<void>;
  };
  pageActionGroups: {
    renameCreateZip?: Record<string, unknown>;
    jump?: Record<string, unknown>;
    properties?: Record<string, unknown>;
    selection?: Record<string, unknown>;
    openers?: Record<string, unknown>;
    context?: Record<string, unknown>;
    status?: Record<string, unknown>;
  };
  propertiesExtras?: Record<string, unknown>;
  showError: (err: unknown) => void;
  exitApp: () => void;
  focusPathInput: () => void;
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Assembles the flat handler map used by the mount layer from action objects
 * and page action groups. (Previously split across two files.)
 */
export function buildPageMountHandlersFromState(params: MountHandlersFromStateParams) {
  const groups = params.pageActionGroups ?? {};
  return {
    // Keymap
    matchesAction:    params.actions.matchesAction,
    handleSortMenuKey:params.actions.handleSortMenuKey,
    // Focus
    focusTreeTop:     params.actions.focusTreeTop,
    focusList:        params.actions.focusList,
    moveFocusByRow:   params.actions.moveFocusByRow,
    moveFocusByColumn:params.actions.moveFocusByColumn,
    // Tree
    handleTreeKey:    params.actions.handleTreeKey,
    buildTreeRoot:    params.actions.buildTreeRoot,
    // Menu
    openSortMenu:     params.actions.openSortMenu,
    closeSortMenu:    params.actions.closeSortMenu,
    closeMenu:        params.actions.closeMenu,
    // List
    updateListRows:   params.actions.updateListRows,
    scheduleUiSave:   params.actions.scheduleUiSave,
    loadDir:          params.actions.loadDir,
    // Misc
    showError:        params.showError,
    exitApp:          params.exitApp,
    focusPathInput:   params.focusPathInput,
    // Action groups (spread order: renameCreate, jump, properties+extras, selection, openers, context, status)
    ...(groups.renameCreateZip ?? {}),
    ...(groups.jump ?? {}),
    ...(groups.properties ?? {}),
    ...(params.propertiesExtras ?? {}),
    ...(groups.selection ?? {}),
    ...(groups.openers ?? {}),
    ...(groups.context ?? {}),
    ...(groups.status ?? {}),
  };
}

