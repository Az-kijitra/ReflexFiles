/**
 * @param {object} params
 */
export function buildViewPropsInputsOverlay(params) {
  const { overlay } = params;

  return {
    dropdownEl: overlay.dropdown.dropdownEl,
    dropdownMode: overlay.dropdown.dropdownMode,
    dropdownOpen: overlay.dropdown.dropdownOpen,
    dropdownIndex: overlay.dropdown.dropdownIndex,
    searchQuery: overlay.search.searchQuery,
    searchRegex: overlay.search.searchRegex,
    searchInputEl: overlay.search.searchInputEl,
    sortMenuIndex: overlay.sort.sortMenuIndex,
    sortMenuEl: overlay.sort.sortMenuEl,
    aboutModalEl: overlay.about.aboutModalEl,
    deleteModalEl: overlay.delete.deleteModalEl,
    deleteConfirmIndex: overlay.delete.deleteConfirmIndex,
    pasteModalEl: overlay.paste.pasteModalEl,
    pasteApplyAll: overlay.paste.pasteApplyAll,
    pasteConfirmIndex: overlay.paste.pasteConfirmIndex,
    createModalEl: overlay.create.createModalEl,
    createInputEl: overlay.create.createInputEl,
    createType: overlay.create.createType,
    createName: overlay.create.createName,
    jumpUrlModalEl: overlay.jump.jumpUrlModalEl,
    jumpUrlInputEl: overlay.jump.jumpUrlInputEl,
    jumpUrlValue: overlay.jump.jumpUrlValue,
    jumpUrlError: overlay.jump.jumpUrlError,
    renameModalEl: overlay.rename.renameModalEl,
    renameInputEl: overlay.rename.renameInputEl,
    renameValue: overlay.rename.renameValue,
    propertiesModalEl: overlay.properties.propertiesModalEl,
    propertiesCloseButton: overlay.properties.propertiesCloseButton,
    dirStatsTimeoutMs: overlay.dirStats.dirStatsTimeoutMs,
    zipModalEl: overlay.zip.zipModalEl,
    zipDestination: overlay.zip.zipDestination,
    zipPassword: overlay.zip.zipPassword,
    zipConfirmIndex: overlay.zip.zipConfirmIndex,
    zipOverwriteConfirmed: overlay.zip.zipOverwriteConfirmed,
    contextMenuEl: overlay.contextMenu.contextMenuEl,
    failureModalEl: overlay.failure.failureModalEl,
  };
}
