/**
 * @param {{ state: any; statusTimer: ReturnType<typeof setTimeout> | null; getActivePane?: () => any }} params
 */
export function buildPageActionsStateVarsFromState(params) {
  const { state, statusTimer } = params;

  const activePane = params.getActivePane
    ? params.getActivePane()
    : state.activePaneId === "right" && state.layoutMode === "dual" ? state.rightPane : state;

  return {
    pastePendingPaths: state.pastePendingPaths,
    pasteConflicts: state.pasteConflicts,
    pasteMode: state.pasteMode,
    pasteApplyAll: state.pasteApplyAll,
    deleteTargets: state.deleteTargets,
    renameTarget: state.renameTarget,
    renameValue: state.renameValue,
    createType: state.createType,
    createName: state.createName,
    jumpUrlValue: state.jumpUrlValue,
    jumpList: state.jumpList,
    pathHistory: state.pathHistory,
    searchQuery: state.searchQuery,
    searchHistory: state.searchHistory,
    ui_language: state.ui_language,
    externalAppAssociations: state.externalAppAssociations,
    externalApps: state.externalApps,
    contextMenuOpen: state.contextMenuOpen,
    contextMenuPos: state.contextMenuPos,
    contextMenuMode: state.contextMenuMode,
    contextMenuCanPaste: state.contextMenuCanPaste,
    contextMenuIndex: state.contextMenuIndex,
    lastClipboard: state.lastClipboard,
    dropdownOpen: state.dropdownOpen,
    statusMessage: state.statusMessage,
    statusTimer,
    error: activePane.error,
    failureModalOpen: state.failureModalOpen,
    failureModalTitle: state.failureModalTitle,
    failureItems: state.failureItems,
    currentPath: activePane.currentPath,
    currentPathCapabilities: activePane.currentPathCapabilities,
    entries: activePane.entries,
    focusedIndex: activePane.focusedIndex,
    selectedPaths: activePane.selectedPaths,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    zipMode: state.zipMode,
    zipTargets: state.zipTargets,
    zipDestination: state.zipDestination,
    zipPassword: state.zipPassword,
    zipPasswordAttempts: state.zipPasswordAttempts,
    zipOverwriteConfirmed: state.zipOverwriteConfirmed,
  };
}
