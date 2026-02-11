/**
 * @param {{
 *   state: any;
 *   refs: {
 *     dropdownEl: HTMLElement | null;
 *     searchInputEl: HTMLInputElement | null;
 *     sortMenuEl: HTMLElement | null;
 *     aboutModalEl: HTMLElement | null;
 *     deleteModalEl: HTMLElement | null;
 *     pasteModalEl: HTMLElement | null;
 *     createModalEl: HTMLElement | null;
 *     createInputEl: HTMLInputElement | null;
 *     jumpUrlModalEl: HTMLElement | null;
 *     jumpUrlInputEl: HTMLInputElement | null;
 *     renameModalEl: HTMLElement | null;
 *     renameInputEl: HTMLInputElement | null;
 *     propertiesModalEl: HTMLElement | null;
 *     propertiesCloseButton: HTMLElement | null;
 *     zipModalEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *     failureModalEl: HTMLElement | null;
 *   };
 * }} params
 */
export function buildOverlayStateFromState(params) {
  const { state, refs } = params;

  return {
    dropdownEl: refs.dropdownEl,
    dropdownMode: state.dropdownMode,
    dropdownOpen: state.dropdownOpen,
    dropdownIndex: state.dropdownIndex,
    searchQuery: state.searchQuery,
    searchRegex: state.searchRegex,
    searchInputEl: refs.searchInputEl,
    sortMenuIndex: state.sortMenuIndex,
    sortMenuEl: refs.sortMenuEl,
    aboutModalEl: refs.aboutModalEl,
    deleteModalEl: refs.deleteModalEl,
    deleteConfirmIndex: state.deleteConfirmIndex,
    pasteModalEl: refs.pasteModalEl,
    pasteApplyAll: state.pasteApplyAll,
    pasteConfirmIndex: state.pasteConfirmIndex,
    createModalEl: refs.createModalEl,
    createInputEl: refs.createInputEl,
    createType: state.createType,
    createName: state.createName,
    jumpUrlModalEl: refs.jumpUrlModalEl,
    jumpUrlInputEl: refs.jumpUrlInputEl,
    jumpUrlValue: state.jumpUrlValue,
    jumpUrlError: state.jumpUrlError,
    renameModalEl: refs.renameModalEl,
    renameInputEl: refs.renameInputEl,
    renameValue: state.renameValue,
    propertiesModalEl: refs.propertiesModalEl,
    propertiesCloseButton: refs.propertiesCloseButton,
    dirStatsTimeoutMs: state.dirStatsTimeoutMs,
    zipModalEl: refs.zipModalEl,
    zipDestination: state.zipDestination,
    zipPassword: state.zipPassword,
    zipConfirmIndex: state.zipConfirmIndex,
    zipOverwriteConfirmed: state.zipOverwriteConfirmed,
    contextMenuEl: refs.contextMenuEl,
    failureModalEl: refs.failureModalEl,
  };
}
