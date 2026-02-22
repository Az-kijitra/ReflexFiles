/**
 * @param {object} params
 */
export function buildViewPropsInputsActions(params) {
  const { actions } = params;

  return {
    pageActions: actions.core.pageActions,
    toggleMenu: actions.menu.toggleMenu,
    getMenuItems: actions.menu.getMenuItems,
    closeMenu: actions.menu.closeMenu,
    loadDir: actions.navigation.loadDir,
    focusList: actions.navigation.focusList,
    handlePathTabCompletion: actions.navigation.handlePathTabCompletion,
    handlePathCompletionSeparator: actions.navigation.handlePathCompletionSeparator,
    handlePathCompletionInputChange: actions.navigation.handlePathCompletionInputChange,
    clearPathCompletionPreview: actions.navigation.clearPathCompletionPreview,
    setStatusMessage: actions.navigation.setStatusMessage,
    getVisibleTreeNodes: actions.tree.getVisibleTreeNodes,
    focusTree: actions.tree.focusTree,
    selectTreeNode: actions.tree.selectTreeNode,
    toggleTreeNode: actions.tree.toggleTreeNode,
    matchesAction: actions.keymap.matchesAction,
    trapModalTab: actions.keymap.trapModalTab,
    setSort: actions.sort.setSort,
    handleSortMenuKey: actions.sort.handleSortMenuKey,
    openUrl: actions.external.openUrl,
    saveDirStatsTimeout: actions.properties.saveDirStatsTimeout,
    clearDirStatsCache: actions.properties.clearDirStatsCache,
    retryDirStats: actions.properties.retryDirStats,
    cancelDirStats: actions.properties.cancelDirStats,
    closeProperties: actions.properties.closeProperties,
    autofocus: actions.misc.autofocus,
    getContextMenuItems: actions.misc.getContextMenuItems,
    getSelectableIndex: actions.misc.getSelectableIndex,
    handleContextMenuKey: actions.misc.handleContextMenuKey,
    failureMessage: actions.misc.failureMessage,
  };
}
