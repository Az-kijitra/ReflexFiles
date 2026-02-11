/**
 * @param {object} params
 * @param {object} params.state
 */
export function buildOverlayBindings({ state }) {
  return {
    dropdownEl: state.dropdownEl,
    dropdownMode: state.dropdownMode,
    dropdownOpen: state.dropdownOpen,
    dropdownIndex: state.dropdownIndex,
    searchQuery: state.searchQuery,
    searchRegex: state.searchRegex,
    searchInputEl: state.searchInputEl,
    sortMenuIndex: state.sortMenuIndex,
    sortMenuEl: state.sortMenuEl,
    aboutModalEl: state.aboutModalEl,
    deleteModalEl: state.deleteModalEl,
    deleteConfirmIndex: state.deleteConfirmIndex,
    pasteModalEl: state.pasteModalEl,
    pasteApplyAll: state.pasteApplyAll,
    pasteConfirmIndex: state.pasteConfirmIndex,
    createModalEl: state.createModalEl,
    createInputEl: state.createInputEl,
    createType: state.createType,
    createName: state.createName,
    jumpUrlModalEl: state.jumpUrlModalEl,
    jumpUrlInputEl: state.jumpUrlInputEl,
    jumpUrlValue: state.jumpUrlValue,
    jumpUrlError: state.jumpUrlError,
    renameModalEl: state.renameModalEl,
    renameInputEl: state.renameInputEl,
    renameValue: state.renameValue,
    propertiesModalEl: state.propertiesModalEl,
    propertiesCloseButton: state.propertiesCloseButton,
    dirStatsTimeoutMs: state.dirStatsTimeoutMs,
    zipModalEl: state.zipModalEl,
    zipDestination: state.zipDestination,
    zipPassword: state.zipPassword,
    zipConfirmIndex: state.zipConfirmIndex,
    zipOverwriteConfirmed: state.zipOverwriteConfirmed,
    contextMenuEl: state.contextMenuEl,
    failureModalEl: state.failureModalEl,
  };
}
