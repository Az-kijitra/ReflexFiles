/**
 * @param {{
 *   dropdownEl: HTMLElement | null;
 *   dropdownMode: string;
 *   dropdownOpen: boolean;
 *   dropdownIndex: number;
 *   searchQuery: string;
 *   searchRegex: boolean;
 *   searchInputEl: HTMLInputElement | null;
 *   sortMenuIndex: number;
 *   sortMenuEl: HTMLElement | null;
 *   aboutModalEl: HTMLElement | null;
 *   deleteModalEl: HTMLElement | null;
 *   deleteConfirmIndex: number;
 *   pasteModalEl: HTMLElement | null;
 *   pasteApplyAll: boolean;
 *   pasteConfirmIndex: number;
 *   createModalEl: HTMLElement | null;
 *   createInputEl: HTMLInputElement | null;
 *   createType: "file" | "folder";
 *   createName: string;
 *   jumpUrlModalEl: HTMLElement | null;
 *   jumpUrlInputEl: HTMLInputElement | null;
 *   jumpUrlValue: string;
 *   jumpUrlError: string;
 *   renameModalEl: HTMLElement | null;
 *   renameInputEl: HTMLInputElement | null;
 *   renameValue: string;
 *   propertiesModalEl: HTMLElement | null;
 *   propertiesCloseButton: HTMLButtonElement | null;
 *   dirStatsTimeoutMs: number;
 *   zipModalEl: HTMLElement | null;
 *   zipDestination: string;
 *   zipPassword: string;
 *   zipConfirmIndex: number;
 *   zipOverwriteConfirmed: boolean;
 *   contextMenuEl: HTMLElement | null;
 *   failureModalEl: HTMLElement | null;
 * }} params
 */
export function buildOverlayState(params) {
  return {
    dropdownEl: params.dropdownEl,
    dropdownMode: params.dropdownMode,
    dropdownOpen: params.dropdownOpen,
    dropdownIndex: params.dropdownIndex,
    searchQuery: params.searchQuery,
    searchRegex: params.searchRegex,
    searchInputEl: params.searchInputEl,
    sortMenuIndex: params.sortMenuIndex,
    sortMenuEl: params.sortMenuEl,
    aboutModalEl: params.aboutModalEl,
    deleteModalEl: params.deleteModalEl,
    deleteConfirmIndex: params.deleteConfirmIndex,
    pasteModalEl: params.pasteModalEl,
    pasteApplyAll: params.pasteApplyAll,
    pasteConfirmIndex: params.pasteConfirmIndex,
    createModalEl: params.createModalEl,
    createInputEl: params.createInputEl,
    createType: params.createType,
    createName: params.createName,
    jumpUrlModalEl: params.jumpUrlModalEl,
    jumpUrlInputEl: params.jumpUrlInputEl,
    jumpUrlValue: params.jumpUrlValue,
    jumpUrlError: params.jumpUrlError,
    renameModalEl: params.renameModalEl,
    renameInputEl: params.renameInputEl,
    renameValue: params.renameValue,
    propertiesModalEl: params.propertiesModalEl,
    propertiesCloseButton: params.propertiesCloseButton,
    dirStatsTimeoutMs: params.dirStatsTimeoutMs,
    zipModalEl: params.zipModalEl,
    zipDestination: params.zipDestination,
    zipPassword: params.zipPassword,
    zipConfirmIndex: params.zipConfirmIndex,
    zipOverwriteConfirmed: params.zipOverwriteConfirmed,
    contextMenuEl: params.contextMenuEl,
    failureModalEl: params.failureModalEl,
  };
}
