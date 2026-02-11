/**
 * @param {object} params
 */
export function buildViewInputsOverlay(params) {
  return {
    dropdown: {
      dropdownEl: params.overlay.dropdownEl,
      dropdownMode: params.overlay.dropdownMode,
      dropdownOpen: params.overlay.dropdownOpen,
      dropdownIndex: params.overlay.dropdownIndex,
    },
    search: {
      searchQuery: params.overlay.searchQuery,
      searchRegex: params.overlay.searchRegex,
      searchInputEl: params.overlay.searchInputEl,
    },
    sort: {
      sortMenuIndex: params.overlay.sortMenuIndex,
      sortMenuEl: params.overlay.sortMenuEl,
    },
    about: { aboutModalEl: params.overlay.aboutModalEl },
    delete: {
      deleteModalEl: params.overlay.deleteModalEl,
      deleteConfirmIndex: params.overlay.deleteConfirmIndex,
    },
    paste: {
      pasteModalEl: params.overlay.pasteModalEl,
      pasteApplyAll: params.overlay.pasteApplyAll,
      pasteConfirmIndex: params.overlay.pasteConfirmIndex,
    },
    create: {
      createModalEl: params.overlay.createModalEl,
      createInputEl: params.overlay.createInputEl,
      createType: params.overlay.createType,
      createName: params.overlay.createName,
    },
    jump: {
      jumpUrlModalEl: params.overlay.jumpUrlModalEl,
      jumpUrlInputEl: params.overlay.jumpUrlInputEl,
      jumpUrlValue: params.overlay.jumpUrlValue,
      jumpUrlError: params.overlay.jumpUrlError,
    },
    rename: {
      renameModalEl: params.overlay.renameModalEl,
      renameInputEl: params.overlay.renameInputEl,
      renameValue: params.overlay.renameValue,
    },
    properties: {
      propertiesModalEl: params.overlay.propertiesModalEl,
      propertiesCloseButton: params.overlay.propertiesCloseButton,
    },
    dirStats: { dirStatsTimeoutMs: params.overlay.dirStatsTimeoutMs },
    zip: {
      zipModalEl: params.overlay.zipModalEl,
      zipDestination: params.overlay.zipDestination,
      zipPassword: params.overlay.zipPassword,
      zipConfirmIndex: params.overlay.zipConfirmIndex,
      zipOverwriteConfirmed: params.overlay.zipOverwriteConfirmed,
    },
    contextMenu: { contextMenuEl: params.overlay.contextMenuEl },
    failure: { failureModalEl: params.overlay.failureModalEl },
  };
}
