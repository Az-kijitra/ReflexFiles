/**
 * @param {{
 *   pageActions: any;
 *   propertiesActions: any;
 * }} params
 */
export function buildPageActionGroups(params) {
  const { pageActions, propertiesActions } = params;
  return {
    properties: {
      openProperties: propertiesActions.openProperties,
      closeProperties: propertiesActions.closeProperties,
      startDirStats: propertiesActions.startDirStats,
      cancelDirStats: propertiesActions.cancelDirStats,
      retryDirStats: propertiesActions.retryDirStats,
      saveDirStatsTimeout: propertiesActions.saveDirStatsTimeout,
    },
    pasteDeleteZip: {
      confirmPasteOverwrite: pageActions.confirmPasteOverwrite,
      confirmPasteSkip: pageActions.confirmPasteSkip,
      cancelPasteConfirm: pageActions.cancelPasteConfirm,
      confirmDelete: pageActions.confirmDelete,
      cancelDelete: pageActions.cancelDelete,
      runZipAction: pageActions.runZipAction,
      closeZipModal: pageActions.closeZipModal,
      showFailures: pageActions.showFailures,
      failureMessage: pageActions.failureMessage,
      closeFailureModal: pageActions.closeFailureModal,
    },
    renameCreateZip: {
      openRename: pageActions.openRename,
      confirmRename: pageActions.confirmRename,
      cancelRename: pageActions.cancelRename,
      openCreate: pageActions.openCreate,
      confirmCreate: pageActions.confirmCreate,
      cancelCreate: pageActions.cancelCreate,
      openZipCreate: pageActions.openZipCreate,
      openZipExtract: pageActions.openZipExtract,
    },
    search: {
      applySearch: pageActions.applySearch,
      clearSearch: pageActions.clearSearch,
      onSearchKeydown: pageActions.onSearchKeydown,
      scrollDropdownToIndex: pageActions.scrollDropdownToIndex,
      removeJump: pageActions.removeJump,
      removeHistory: pageActions.removeHistory,
      selectDropdown: pageActions.selectDropdown,
      showError: pageActions.showError,
    },
    jump: {
      addJumpCurrent: pageActions.addJumpCurrent,
      openJumpUrlModal: pageActions.openJumpUrlModal,
      confirmJumpUrl: pageActions.confirmJumpUrl,
      cancelJumpUrl: pageActions.cancelJumpUrl,
    },
    openers: {
      openFocusedOrSelected: pageActions.openFocusedOrSelected,
      openParentForSelection: pageActions.openParentForSelection,
      openUserManual: pageActions.openUserManual,
      openAbout: pageActions.openAbout,
      closeAbout: pageActions.closeAbout,
      openEntry: pageActions.openEntry,
      openInExplorer: pageActions.openInExplorer,
      openInCmd: pageActions.openInCmd,
      openInVSCode: pageActions.openInVSCode,
      openInGitClient: pageActions.openInGitClient,
      openConfigFile: pageActions.openConfigFile,
      openKeymapHelp: pageActions.openKeymapHelp,
    },
    selection: {
      pushUndoEntry: pageActions.pushUndoEntry,
      clearSelection: pageActions.clearSelection,
      invertSelection: pageActions.invertSelection,
      copySelected: pageActions.copySelected,
      cutSelected: pageActions.cutSelected,
      pasteItems: pageActions.pasteItems,
      duplicateSelected: pageActions.duplicateSelected,
      prefixDateSelected: pageActions.prefixDateSelected,
      performUndo: pageActions.performUndo,
      performRedo: pageActions.performRedo,
      toggleSelection: pageActions.toggleSelection,
      selectRange: pageActions.selectRange,
      selectAll: pageActions.selectAll,
      setSelected: pageActions.setSelected,
    },
    context: {
      openContextMenu: pageActions.openContextMenu,
      closeContextMenu: pageActions.closeContextMenu,
      getSelectableIndex: pageActions.getSelectableIndex,
      handleContextMenuKey: pageActions.handleContextMenuKey,
      getContextMenuItems: pageActions.getContextMenuItems,
      requestDeleteSelected: pageActions.requestDeleteSelected,
      requestOpenPropertiesSelected: pageActions.requestOpenPropertiesSelected,
      getExternalApps: pageActions.getExternalApps,
      runExternalApp: pageActions.runExternalApp,
      getTargetEntry: pageActions.getTargetEntry,
    },
    status: {
      setStatusMessage: pageActions.setStatusMessage,
    },
  };
}
