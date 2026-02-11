/**
 * @param {object} params
 */
export function buildDomHandlersState(params) {
  return {
    getListEl: params.getListEl,
    getPathInputEl: params.getPathInputEl,
    getTreeEl: params.getTreeEl,
    getDropdownEl: params.getDropdownEl,
    getContextMenuEl: params.getContextMenuEl,
    getPasteConfirmOpen: params.getPasteConfirmOpen,
    getDeleteConfirmOpen: params.getDeleteConfirmOpen,
    getJumpUrlOpen: params.getJumpUrlOpen,
    getSortMenuOpen: params.getSortMenuOpen,
    getZipModalOpen: params.getZipModalOpen,
    getFailureModalOpen: params.getFailureModalOpen,
    getDropdownOpen: params.getDropdownOpen,
    getRenameOpen: params.getRenameOpen,
    getCreateOpen: params.getCreateOpen,
    getPropertiesOpen: params.getPropertiesOpen,
    getContextMenuOpen: params.getContextMenuOpen,
    getShowTree: params.getShowTree,
    getShowHidden: params.getShowHidden,
    getShowSize: params.getShowSize,
    getShowTime: params.getShowTime,
    getSearchActive: params.getSearchActive,
    getCurrentPath: params.getCurrentPath,
    getDropdownMode: params.getDropdownMode,
    getEntries: params.getEntries,
    getFocusedIndex: params.getFocusedIndex,
    getListRows: params.getListRows,
    getSelectedPaths: params.getSelectedPaths,
    getJumpList: params.getJumpList,
    getPathHistory: params.getPathHistory,
    getMenuOpen: params.getMenuOpen,
    getMenuBarEl: params.getMenuBarEl,
  };
}
