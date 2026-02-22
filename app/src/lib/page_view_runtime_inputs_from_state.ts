/**
 * @param {{
 *   state: any;
 *   treeEl: HTMLElement | null;
 *   pageActions: Record<string, any>;
 *   pageActionGroups: {
 *     properties: {
 *       closeProperties: () => void;
 *       saveDirStatsTimeout: () => Promise<void>;
 *       retryDirStats: () => void;
 *       cancelDirStats: () => void;
 *     };
 *     context: {
 *       getContextMenuItems: () => any[];
 *       getSelectableIndex: () => number | null;
 *       handleContextMenuKey: (event: KeyboardEvent) => void;
 *     };
 *     status: { setStatusMessage: (message: string, opts?: any) => void };
 *     pasteDeleteZip: { failureMessage: (item: any) => string };
 *   };
 *   menu: {
 *     toggleMenu: () => void;
 *     getMenuItems: () => any[];
 *     closeMenu: () => void;
 *   };
 *   list: {
 *     loadDir: (path: string) => Promise<void>;
 *     focusList: () => void;
 *     handlePathTabCompletion: () => Promise<void>;
 *     handlePathCompletionSeparator: (pathInput: string, key: string) => Promise<boolean>;
 *     handlePathCompletionInputChange: (pathInput: string) => void;
 *     clearPathCompletionPreview: () => void;
 *   };
 *   tree: {
 *     focusTree: () => void;
 *     focusTreeTop: () => void;
 *     selectTreeNode: (node: any, index: number) => void;
 *     toggleTreeNode: (node: any, index: number, event?: MouseEvent) => void;
 *   };
 *   keymap: { matchesAction: (action: string, key: string) => boolean };
 *   sort: {
 *     setSort: (key: string) => void;
 *     handleSortMenuKey: (event: KeyboardEvent) => void;
 *   };
 *   deps: {
 *     getVisibleTreeNodes: (...args: any[]) => any[];
 *     trapModalTab: (event: KeyboardEvent, el: HTMLElement | null) => boolean;
 *     openUrl: (url: string) => Promise<void>;
 *     autofocus: (el: HTMLElement | null) => void;
 *   };
 *   dirStats: { clearDirStatsCache: () => void };
 *   meta: any;
 *   overlay: any;
 * }} params
 */
export function buildViewRuntimeInputsFromState(params) {
  return {
    state: params.state,
    treeEl: params.treeEl,
    actions: buildViewRuntimeActionsFromState(params),
    meta: params.meta,
    overlay: params.overlay,
  };
}

/**
 * @param {Parameters<typeof buildViewRuntimeInputsFromState>[0]} params
 */
function buildViewRuntimeActionsFromState(params) {
  const { properties, context, status, pasteDeleteZip } = params.pageActionGroups;
  return {
    pageActions: params.pageActions,
    toggleMenu: params.menu.toggleMenu,
    getMenuItems: params.menu.getMenuItems,
    closeMenu: params.menu.closeMenu,
    loadDir: params.list.loadDir,
    focusList: params.list.focusList,
    focusTreeTop: params.tree.focusTreeTop,
    handlePathTabCompletion: params.list.handlePathTabCompletion,
    handlePathCompletionSeparator: params.list.handlePathCompletionSeparator,
    handlePathCompletionInputChange: params.list.handlePathCompletionInputChange,
    clearPathCompletionPreview: params.list.clearPathCompletionPreview,
    setStatusMessage: status.setStatusMessage,
    getVisibleTreeNodes: params.deps.getVisibleTreeNodes,
    focusTree: params.tree.focusTree,
    selectTreeNode: params.tree.selectTreeNode,
    toggleTreeNode: params.tree.toggleTreeNode,
    matchesAction: params.keymap.matchesAction,
    trapModalTab: params.deps.trapModalTab,
    setSort: params.sort.setSort,
    handleSortMenuKey: params.sort.handleSortMenuKey,
    openUrl: params.deps.openUrl,
    saveDirStatsTimeout: properties.saveDirStatsTimeout,
    clearDirStatsCache: params.dirStats.clearDirStatsCache,
    retryDirStats: properties.retryDirStats,
    cancelDirStats: properties.cancelDirStats,
    closeProperties: properties.closeProperties,
    autofocus: params.deps.autofocus,
    getContextMenuItems: context.getContextMenuItems,
    getSelectableIndex: context.getSelectableIndex,
    handleContextMenuKey: context.handleContextMenuKey,
    failureMessage: pasteDeleteZip.failureMessage,
  };
}
