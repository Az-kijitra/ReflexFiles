/**
 * @param {object} vars
 */
export function buildViewInputStateFromVars(vars) {
  return {
    menuOpen: vars.menuOpen,
    currentPath: vars.currentPath,
    pathHistory: vars.pathHistory,
    showTree: vars.showTree,
    treeEl: vars.treeEl,
    treeLoading: vars.treeLoading,
    treeRoot: vars.treeRoot,
    treeSelectedPath: vars.treeSelectedPath,
    treeFocusedIndex: vars.treeFocusedIndex,
    showSize: vars.showSize,
    showTime: vars.showTime,
    loading: vars.loading,
    filteredEntries: vars.filteredEntries,
    entries: vars.entries,
    overflowLeft: vars.overflowLeft,
    overflowRight: vars.overflowRight,
    visibleColStart: vars.visibleColStart,
    visibleColEnd: vars.visibleColEnd,
    listRows: vars.listRows,
    selectedPaths: vars.selectedPaths,
    dropdownItems: vars.dropdownItems,
    searchActive: vars.searchActive,
    searchError: vars.searchError,
    sortMenuOpen: vars.sortMenuOpen,
    aboutOpen: vars.aboutOpen,
    deleteConfirmOpen: vars.deleteConfirmOpen,
    deleteTargets: vars.deleteTargets,
    deleteError: vars.deleteError,
    pasteConfirmOpen: vars.pasteConfirmOpen,
    pasteConflicts: vars.pasteConflicts,
    createOpen: vars.createOpen,
    createError: vars.createError,
    jumpUrlOpen: vars.jumpUrlOpen,
    renameOpen: vars.renameOpen,
    renameError: vars.renameError,
    propertiesOpen: vars.propertiesOpen,
    propertiesData: vars.propertiesData,
    dirStatsInFlight: vars.dirStatsInFlight,
    zipModalOpen: vars.zipModalOpen,
    zipMode: vars.zipMode,
    zipTargets: vars.zipTargets,
    zipPasswordAttempts: vars.zipPasswordAttempts,
    zipOverwriteConfirmed: vars.zipOverwriteConfirmed,
    zipError: vars.zipError,
    contextMenuOpen: vars.contextMenuOpen,
    contextMenuPos: vars.contextMenuPos,
    contextMenuIndex: vars.contextMenuIndex,
    error: vars.error,
    failureModalOpen: vars.failureModalOpen,
    failureModalTitle: vars.failureModalTitle,
    failureItems: vars.failureItems,
    jumpList: vars.jumpList,
  };
}

/**
 * @param {object} vars
 */
export function buildViewInputActionsFromVars(vars) {
  return {
    pageActions: vars.pageActions,
    toggleMenu: vars.toggleMenu,
    getMenuItems: vars.getMenuItems,
    closeMenu: vars.closeMenu,
    loadDir: vars.loadDir,
    focusList: vars.focusList,
    focusTreeTop: vars.focusTreeTop,
    handlePathTabCompletion: vars.handlePathTabCompletion,
    setStatusMessage: vars.setStatusMessage,
    getVisibleTreeNodes: vars.getVisibleTreeNodes,
    focusTree: vars.focusTree,
    selectTreeNode: vars.selectTreeNode,
    toggleTreeNode: vars.toggleTreeNode,
    matchesAction: vars.matchesAction,
    trapModalTab: vars.trapModalTab,
    setSort: vars.setSort,
    handleSortMenuKey: vars.handleSortMenuKey,
    openUrl: vars.openUrl,
    saveDirStatsTimeout: vars.saveDirStatsTimeout,
    clearDirStatsCache: vars.clearDirStatsCache,
    retryDirStats: vars.retryDirStats,
    cancelDirStats: vars.cancelDirStats,
    closeProperties: vars.closeProperties,
    autofocus: vars.autofocus,
    getContextMenuItems: vars.getContextMenuItems,
    getSelectableIndex: vars.getSelectableIndex,
    handleContextMenuKey: vars.handleContextMenuKey,
    failureMessage: vars.failureMessage,
  };
}

/**
 * @param {object} vars
 */
export function buildViewInputMetaFromVars(vars) {
  return {
    formatName: vars.formatName,
    formatSize: vars.formatSize,
    formatModified: vars.formatModified,
    MENU_GROUPS: vars.MENU_GROUPS,
    ABOUT_URL: vars.ABOUT_URL,
    ABOUT_LICENSE: vars.ABOUT_LICENSE,
    ZIP_PASSWORD_MAX_ATTEMPTS: vars.ZIP_PASSWORD_MAX_ATTEMPTS,
    t: vars.t,
  };
}

/**
 * @param {object} vars
 */
export function buildViewInputOverlayFromVars(vars) {
  return {
    dropdownEl: vars.dropdownEl,
    dropdownMode: vars.dropdownMode,
    dropdownOpen: vars.dropdownOpen,
    dropdownIndex: vars.dropdownIndex,
    searchQuery: vars.searchQuery,
    searchRegex: vars.searchRegex,
    searchInputEl: vars.searchInputEl,
    sortMenuIndex: vars.sortMenuIndex,
    sortMenuEl: vars.sortMenuEl,
    aboutModalEl: vars.aboutModalEl,
    deleteModalEl: vars.deleteModalEl,
    deleteConfirmIndex: vars.deleteConfirmIndex,
    pasteModalEl: vars.pasteModalEl,
    pasteApplyAll: vars.pasteApplyAll,
    pasteConfirmIndex: vars.pasteConfirmIndex,
    createModalEl: vars.createModalEl,
    createInputEl: vars.createInputEl,
    createType: vars.createType,
    createName: vars.createName,
    jumpUrlModalEl: vars.jumpUrlModalEl,
    jumpUrlInputEl: vars.jumpUrlInputEl,
    jumpUrlValue: vars.jumpUrlValue,
    jumpUrlError: vars.jumpUrlError,
    renameModalEl: vars.renameModalEl,
    renameInputEl: vars.renameInputEl,
    renameValue: vars.renameValue,
    propertiesModalEl: vars.propertiesModalEl,
    propertiesCloseButton: vars.propertiesCloseButton,
    dirStatsTimeoutMs: vars.dirStatsTimeoutMs,
    zipModalEl: vars.zipModalEl,
    zipDestination: vars.zipDestination,
    zipPassword: vars.zipPassword,
    zipConfirmIndex: vars.zipConfirmIndex,
    contextMenuEl: vars.contextMenuEl,
    failureModalEl: vars.failureModalEl,
  };
}

/**
 * @param {{ state: any; actions: any; meta: any; overlay: any }} parts
 */
export function buildViewInputsFromParts(parts) {
  return {
    state: parts.state,
    actions: parts.actions,
    meta: parts.meta,
    overlay: parts.overlay,
  };
}
