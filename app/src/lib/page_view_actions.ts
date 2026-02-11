/**
 * @param {{
 *   pageActions: Record<string, any>;
 *   toggleMenu: () => void;
 *   getMenuItems: () => any[];
 *   closeMenu: () => void;
 *   loadDir: (path: string) => Promise<void>;
 *   focusList: () => void;
 *   focusTreeTop: () => void;
 *   handlePathTabCompletion: () => Promise<void>;
 *   setStatusMessage: (message: string, opts?: any) => void;
 *   getVisibleTreeNodes: (...args: any[]) => any[];
 *   focusTree: () => void;
 *   selectTreeNode: (node: any, index: number) => void;
 *   toggleTreeNode: (node: any, index: number, event?: MouseEvent) => void;
 *   matchesAction: (action: string, key: string) => boolean;
 *   trapModalTab: (event: KeyboardEvent, el: HTMLElement | null) => boolean;
 *   setSort: (key: string) => void;
 *   handleSortMenuKey: (event: KeyboardEvent) => void;
 *   openUrl: (url: string) => Promise<void>;
 *   saveDirStatsTimeout: () => Promise<void>;
 *   clearDirStatsCache: () => void;
 *   retryDirStats: () => void;
 *   cancelDirStats: () => void;
 *   closeProperties: () => void;
 *   autofocus: (el: HTMLElement | null) => void;
 *   getContextMenuItems: () => any[];
 *   getSelectableIndex: () => number | null;
 *   handleContextMenuKey: (event: KeyboardEvent) => void;
 *   failureMessage: (item: any) => string;
 * }} params
 */
export function buildViewActions(params) {
  const { pageActions } = params;
  return {
    toggleMenu: params.toggleMenu,
    getMenuItems: params.getMenuItems,
    closeMenu: params.closeMenu,
    loadDir: params.loadDir,
    focusList: params.focusList,
    focusTreeTop: params.focusTreeTop,
    handlePathTabCompletion: params.handlePathTabCompletion,
    setStatusMessage: params.setStatusMessage,
    getVisibleTreeNodes: params.getVisibleTreeNodes,
    focusTree: params.focusTree,
    selectTreeNode: params.selectTreeNode,
    toggleTreeNode: params.toggleTreeNode,
    openContextMenu: pageActions.openContextMenu,
    selectRange: pageActions.selectRange,
    toggleSelection: pageActions.toggleSelection,
    setSelected: pageActions.setSelected,
    openEntry: pageActions.openEntry,
    matchesAction: params.matchesAction,
    scrollDropdownToIndex: pageActions.scrollDropdownToIndex,
    selectDropdown: pageActions.selectDropdown,
    removeHistory: pageActions.removeHistory,
    removeJump: pageActions.removeJump,
    trapModalTab: params.trapModalTab,
    onSearchKeydown: pageActions.onSearchKeydown,
    applySearch: pageActions.applySearch,
    clearSearch: pageActions.clearSearch,
    setSort: params.setSort,
    handleSortMenuKey: params.handleSortMenuKey,
    openUrl: params.openUrl,
    closeAbout: pageActions.closeAbout,
    confirmDelete: pageActions.confirmDelete,
    cancelDelete: pageActions.cancelDelete,
    confirmPasteOverwrite: pageActions.confirmPasteOverwrite,
    confirmPasteSkip: pageActions.confirmPasteSkip,
    cancelPasteConfirm: pageActions.cancelPasteConfirm,
    confirmCreate: pageActions.confirmCreate,
    cancelCreate: pageActions.cancelCreate,
    confirmJumpUrl: pageActions.confirmJumpUrl,
    cancelJumpUrl: pageActions.cancelJumpUrl,
    confirmRename: pageActions.confirmRename,
    cancelRename: pageActions.cancelRename,
    saveDirStatsTimeout: params.saveDirStatsTimeout,
    clearDirStatsCache: params.clearDirStatsCache,
    retryDirStats: params.retryDirStats,
    cancelDirStats: params.cancelDirStats,
    closeProperties: params.closeProperties,
    autofocus: params.autofocus,
    runZipAction: pageActions.runZipAction,
    closeZipModal: pageActions.closeZipModal,
    getContextMenuItems: params.getContextMenuItems,
    getSelectableIndex: params.getSelectableIndex,
    handleContextMenuKey: params.handleContextMenuKey,
    failureMessage: params.failureMessage,
    closeFailureModal: pageActions.closeFailureModal,
  };
}
