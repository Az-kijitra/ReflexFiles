import {
  buildViewInputActionsFromVars,
  buildViewInputMetaFromVars,
  buildViewInputOverlayFromVars,
  buildViewInputStateFromVars,
} from "./page_view_inputs_from_vars";

/**
 * @param {{ state: any; treeEl: HTMLElement | null }} params
 */
export function buildViewInputStateFromState(params) {
  const { state, treeEl } = params;
  return buildViewInputStateFromVars({
    menuOpen: state.menuOpen,
    currentPath: state.currentPath,
    pathHistory: state.pathHistory,
    showTree: state.showTree,
    treeEl,
    treeLoading: state.treeLoading,
    treeRoot: state.treeRoot,
    treeSelectedPath: state.treeSelectedPath,
    treeFocusedIndex: state.treeFocusedIndex,
    showSize: state.showSize,
    showTime: state.showTime,
    uiFileIconMode: state.ui_file_icon_mode,
    loading: state.loading,
    filteredEntries: state.filteredEntries,
    pathCompletionPreviewActive: state.pathCompletionPreviewActive,
    entries: state.entries,
    overflowLeft: state.overflowLeft,
    overflowRight: state.overflowRight,
    visibleColStart: state.visibleColStart,
    visibleColEnd: state.visibleColEnd,
    listRows: state.listRows,
    selectedPaths: state.selectedPaths,
    dropdownItems: state.dropdownItems,
    searchActive: state.searchActive,
    searchError: state.searchError,
    sortMenuOpen: state.sortMenuOpen,
    aboutOpen: state.aboutOpen,
    deleteConfirmOpen: state.deleteConfirmOpen,
    deleteTargets: state.deleteTargets,
    deleteError: state.deleteError,
    pasteConfirmOpen: state.pasteConfirmOpen,
    pasteConflicts: state.pasteConflicts,
    createOpen: state.createOpen,
    createError: state.createError,
    jumpUrlOpen: state.jumpUrlOpen,
    renameOpen: state.renameOpen,
    renameError: state.renameError,
    propertiesOpen: state.propertiesOpen,
    propertiesData: state.propertiesData,
    dirStatsInFlight: state.dirStatsInFlight,
    zipModalOpen: state.zipModalOpen,
    zipMode: state.zipMode,
    zipTargets: state.zipTargets,
    zipPasswordAttempts: state.zipPasswordAttempts,
    zipOverwriteConfirmed: state.zipOverwriteConfirmed,
    zipError: state.zipError,
    contextMenuOpen: state.contextMenuOpen,
    contextMenuPos: state.contextMenuPos,
    contextMenuIndex: state.contextMenuIndex,
    error: state.error,
    failureModalOpen: state.failureModalOpen,
    failureModalTitle: state.failureModalTitle,
    failureItems: state.failureItems,
    jumpList: state.jumpList,
  });
}

/**
 * @param {object} vars
 */
export function buildViewInputActionsFromActions(vars) {
  return buildViewInputActionsFromVars(vars);
}

/**
 * @param {object} vars
 */
export function buildViewInputMetaFromMeta(vars) {
  return buildViewInputMetaFromVars(vars);
}

/**
 * @param {object} vars
 */
export function buildViewInputOverlayFromOverlay(vars) {
  return buildViewInputOverlayFromVars(vars);
}
