import type { PageActionsContextParams } from "$lib/page_actions_context_types";

export function buildPageActionsState(params: PageActionsContextParams) {
  const {
    paste,
    delete: deleteGroup,
    rename,
    create,
    jump,
    search,
    external,
    contextMenu,
    clipboard,
    dropdown,
    status,
    failure,
    listing,
    undo,
    zip,
  } = params;
  return {
    pastePendingPaths: paste.pastePendingPaths,
    pasteConflicts: paste.pasteConflicts,
    pasteMode: paste.pasteMode,
    pasteApplyAll: paste.pasteApplyAll,
    deleteTargets: deleteGroup.deleteTargets,
    renameTarget: rename.renameTarget,
    renameValue: rename.renameValue,
    createType: create.createType,
    createName: create.createName,
    jumpUrlValue: jump.jumpUrlValue,
    jumpList: jump.jumpList,
    pathHistory: jump.pathHistory,
    searchQuery: search.searchQuery,
    searchHistory: search.searchHistory,
    ui_language: external.ui_language,
    externalAppAssociations: external.externalAppAssociations,
    externalApps: external.externalApps,
    contextMenuOpen: contextMenu.contextMenuOpen,
    contextMenuPos: contextMenu.contextMenuPos,
    contextMenuMode: contextMenu.contextMenuMode,
    contextMenuCanPaste: contextMenu.contextMenuCanPaste,
    contextMenuIndex: contextMenu.contextMenuIndex,
    lastClipboard: clipboard.lastClipboard,
    dropdownOpen: dropdown.dropdownOpen,
    statusMessage: status.statusMessage,
    statusTimer: status.statusTimer,
    error: failure.error,
    failureModalOpen: failure.failureModalOpen,
    failureModalTitle: failure.failureModalTitle,
    failureItems: failure.failureItems,
    currentPath: listing.currentPath,
    currentPathCapabilities: listing.currentPathCapabilities,
    entries: listing.entries,
    focusedIndex: listing.focusedIndex,
    selectedPaths: listing.selectedPaths,
    undoStack: undo.undoStack,
    redoStack: undo.redoStack,
    zipMode: zip.zipMode,
    zipTargets: zip.zipTargets,
    zipDestination: zip.zipDestination,
    zipPassword: zip.zipPassword,
    zipPasswordAttempts: zip.zipPasswordAttempts,
    zipOverwriteConfirmed: zip.zipOverwriteConfirmed,
  };
}

export function buildPageActionsStateFromVars(
  params: PageActionsContextParams | (() => PageActionsContextParams)
) {
  const getVars = typeof params === "function" ? params : () => params;
  const getter = (key) => () => getVars()[key];
  return buildPageActionsState({
    paste: {
      pastePendingPaths: getter("pastePendingPaths"),
      pasteConflicts: getter("pasteConflicts"),
      pasteMode: getter("pasteMode"),
      pasteApplyAll: getter("pasteApplyAll"),
    },
    delete: {
      deleteTargets: getter("deleteTargets"),
    },
    rename: {
      renameTarget: getter("renameTarget"),
      renameValue: getter("renameValue"),
    },
    create: {
      createType: getter("createType"),
      createName: getter("createName"),
    },
    jump: {
      jumpUrlValue: getter("jumpUrlValue"),
      jumpList: getter("jumpList"),
      pathHistory: getter("pathHistory"),
    },
    search: {
      searchQuery: getter("searchQuery"),
      searchHistory: getter("searchHistory"),
    },
    external: {
      ui_language: getter("ui_language"),
      externalAppAssociations: getter("externalAppAssociations"),
      externalApps: getter("externalApps"),
    },
    contextMenu: {
      contextMenuOpen: getter("contextMenuOpen"),
      contextMenuPos: getter("contextMenuPos"),
      contextMenuMode: getter("contextMenuMode"),
      contextMenuCanPaste: getter("contextMenuCanPaste"),
      contextMenuIndex: getter("contextMenuIndex"),
    },
    clipboard: {
      lastClipboard: getter("lastClipboard"),
    },
    dropdown: {
      dropdownOpen: getter("dropdownOpen"),
    },
    status: {
      statusMessage: getter("statusMessage"),
      statusTimer: getter("statusTimer"),
    },
    failure: {
      error: getter("error"),
      failureModalOpen: getter("failureModalOpen"),
      failureModalTitle: getter("failureModalTitle"),
      failureItems: getter("failureItems"),
    },
    listing: {
      currentPath: getter("currentPath"),
      currentPathCapabilities: getter("currentPathCapabilities"),
      entries: getter("entries"),
      focusedIndex: getter("focusedIndex"),
      selectedPaths: getter("selectedPaths"),
    },
    undo: {
      undoStack: getter("undoStack"),
      redoStack: getter("redoStack"),
    },
    zip: {
      zipMode: getter("zipMode"),
      zipTargets: getter("zipTargets"),
      zipDestination: getter("zipDestination"),
      zipPassword: getter("zipPassword"),
      zipPasswordAttempts: getter("zipPasswordAttempts"),
      zipOverwriteConfirmed: getter("zipOverwriteConfirmed"),
    },
  });
}

/**
 * @param {{
 *   getDeleteModalEl: () => HTMLElement | null;
 *   getRenameInputEl: () => HTMLInputElement | null;
 *   getRenameModalEl: () => HTMLElement | null;
 *   getCreateInputEl: () => HTMLInputElement | null;
 *   getCreateModalEl: () => HTMLElement | null;
 *   getJumpUrlInputEl: () => HTMLInputElement | null;
 *   getJumpUrlModalEl: () => HTMLElement | null;
 *   getContextMenuEl: () => HTMLElement | null;
 *   getDropdownEl: () => HTMLElement | null;
 * }} params
 */
export function buildPageActionsRefs(params) {
  return {
    getDeleteModalEl: params.getDeleteModalEl,
    getRenameInputEl: params.getRenameInputEl,
    getRenameModalEl: params.getRenameModalEl,
    getCreateInputEl: params.getCreateInputEl,
    getCreateModalEl: params.getCreateModalEl,
    getJumpUrlInputEl: params.getJumpUrlInputEl,
    getJumpUrlModalEl: params.getJumpUrlModalEl,
    getContextMenuEl: params.getContextMenuEl,
    getDropdownEl: params.getDropdownEl,
  };
}

/**
 * @param {{
 *   deleteModalEl: HTMLElement | null;
 *   renameInputEl: HTMLInputElement | null;
 *   renameModalEl: HTMLElement | null;
 *   createInputEl: HTMLInputElement | null;
 *   createModalEl: HTMLElement | null;
 *   jumpUrlInputEl: HTMLInputElement | null;
 *   jumpUrlModalEl: HTMLElement | null;
 *   contextMenuEl: HTMLElement | null;
 *   dropdownEl: HTMLElement | null;
 * }} params
 */
export function buildPageActionsRefsFromElements(params) {
  return {
    getDeleteModalEl: () => params.deleteModalEl,
    getRenameInputEl: () => params.renameInputEl,
    getRenameModalEl: () => params.renameModalEl,
    getCreateInputEl: () => params.createInputEl,
    getCreateModalEl: () => params.createModalEl,
    getJumpUrlInputEl: () => params.jumpUrlInputEl,
    getJumpUrlModalEl: () => params.jumpUrlModalEl,
    getContextMenuEl: () => params.contextMenuEl,
    getDropdownEl: () => params.dropdownEl,
  };
}
