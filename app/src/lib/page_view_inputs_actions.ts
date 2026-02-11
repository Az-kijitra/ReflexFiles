/**
 * @param {object} params
 */
export function buildViewInputsActions(params) {
  return {
    core: { pageActions: params.actions.pageActions },
    menu: {
      toggleMenu: params.actions.toggleMenu,
      getMenuItems: params.actions.getMenuItems,
      closeMenu: params.actions.closeMenu,
    },
    navigation: {
      loadDir: params.actions.loadDir,
      focusList: params.actions.focusList,
      focusTreeTop: params.actions.focusTreeTop,
      handlePathTabCompletion: params.actions.handlePathTabCompletion,
      setStatusMessage: params.actions.setStatusMessage,
    },
    tree: {
      getVisibleTreeNodes: params.actions.getVisibleTreeNodes,
      focusTree: params.actions.focusTree,
      selectTreeNode: params.actions.selectTreeNode,
      toggleTreeNode: params.actions.toggleTreeNode,
    },
    keymap: {
      matchesAction: params.actions.matchesAction,
      trapModalTab: params.actions.trapModalTab,
    },
    sort: {
      setSort: params.actions.setSort,
      handleSortMenuKey: params.actions.handleSortMenuKey,
    },
    external: { openUrl: params.actions.openUrl },
    properties: {
      saveDirStatsTimeout: params.actions.saveDirStatsTimeout,
      clearDirStatsCache: params.actions.clearDirStatsCache,
      retryDirStats: params.actions.retryDirStats,
      cancelDirStats: params.actions.cancelDirStats,
      closeProperties: params.actions.closeProperties,
    },
    misc: {
      autofocus: params.actions.autofocus,
      getContextMenuItems: params.actions.getContextMenuItems,
      getSelectableIndex: params.actions.getSelectableIndex,
      handleContextMenuKey: params.actions.handleContextMenuKey,
      failureMessage: params.actions.failureMessage,
    },
  };
}
