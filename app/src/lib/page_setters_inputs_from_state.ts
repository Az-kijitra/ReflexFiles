import { buildPageSettersInputsFromGroups } from "./page_setters_inputs_from_groups";

/**
 * @param {{
 *   state: any;
 *   setStatusTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 * }} params
 */
export function buildPageSettersInputsFromState(params) {
  const { state, setStatusTimer } = params;

  return buildPageSettersInputsFromGroups({
    paste: {
      setPasteConfirmOpen: (value) => {
        state.pasteConfirmOpen = value;
      },
      setPastePendingPaths: (value) => {
        state.pastePendingPaths = value;
      },
      setPasteConflicts: (value) => {
        state.pasteConflicts = value;
      },
      setPasteConfirmIndex: (value) => {
        state.pasteConfirmIndex = value;
      },
      setPasteMode: (value) => {
        state.pasteMode = value;
      },
      setPasteApplyAll: (value) => {
        state.pasteApplyAll = value;
      },
    },
    delete: {
      setDeleteConfirmOpen: (value) => {
        state.deleteConfirmOpen = value;
      },
      setDeleteTargets: (value) => {
        state.deleteTargets = value;
      },
      setDeleteError: (value) => {
        state.deleteError = value;
      },
      setDeleteConfirmIndex: (value) => {
        state.deleteConfirmIndex = value;
      },
    },
    rename: {
      setRenameTarget: (value) => {
        state.renameTarget = value;
      },
      setRenameValue: (value) => {
        state.renameValue = value;
      },
      setRenameError: (value) => {
        state.renameError = value;
      },
      setRenameOpen: (value) => {
        state.renameOpen = value;
      },
    },
    create: {
      setCreateType: (value) => {
        state.createType = value;
      },
      setCreateName: (value) => {
        state.createName = value;
      },
      setCreateError: (value) => {
        state.createError = value;
      },
      setCreateOpen: (value) => {
        state.createOpen = value;
      },
    },
    jump: {
      setJumpUrlOpen: (value) => {
        state.jumpUrlOpen = value;
      },
      setJumpUrlError: (value) => {
        state.jumpUrlError = value;
      },
      setJumpUrlValue: (value) => {
        state.jumpUrlValue = value;
      },
      setJumpList: (value) => {
        state.jumpList = value;
      },
      setPathHistory: (value) => {
        state.pathHistory = value;
      },
    },
    search: {
      setSearchQuery: (value) => {
        state.searchQuery = value;
      },
      setSearchActive: (value) => {
        state.searchActive = value;
      },
      setSearchError: (value) => {
        state.searchError = value;
      },
      setSearchHistory: (value) => {
        state.searchHistory = value;
      },
    },
    about: {
      setAboutOpen: (value) => {
        state.aboutOpen = value;
      },
    },
    selection: {
      setFocusedIndex: (value) => {
        state.focusedIndex = value;
      },
      setSelected: (paths) => {
        state.selectedPaths = paths;
      },
      setAnchorIndex: (value) => {
        state.anchorIndex = value;
      },
    },
    contextMenu: {
      setContextMenuOpen: (value) => {
        state.contextMenuOpen = value;
      },
      setContextMenuPos: (value) => {
        state.contextMenuPos = value;
      },
      setContextMenuMode: (value) => {
        state.contextMenuMode = value;
      },
      setContextMenuCanPaste: (value) => {
        state.contextMenuCanPaste = value;
      },
      setContextMenuIndex: (value) => {
        state.contextMenuIndex = value;
      },
    },
    dropdown: {
      setDropdownOpen: (value) => {
        state.dropdownOpen = value;
      },
    },
    status: {
      setStatusMessageState: (value) => {
        state.statusMessage = value;
      },
      setStatusTimer,
    },
    failure: {
      setError: (value) => {
        state.error = value;
      },
      setFailureModalOpen: (value) => {
        state.failureModalOpen = value;
      },
      setFailureModalTitle: (value) => {
        state.failureModalTitle = value;
      },
      setFailureItems: (value) => {
        state.failureItems = value;
      },
    },
    clipboard: {
      setLastClipboard: (value) => {
        state.lastClipboard = value;
      },
    },
    undo: {
      setUndoStack: (value) => {
        state.undoStack = value;
      },
      setRedoStack: (value) => {
        state.redoStack = value;
      },
    },
    zip: {
      setZipMode: (value) => {
        state.zipMode = value;
      },
      setZipTargets: (value) => {
        state.zipTargets = value;
      },
      setZipDestination: (value) => {
        state.zipDestination = value;
      },
      setZipPassword: (value) => {
        state.zipPassword = value;
      },
      setZipError: (value) => {
        state.zipError = value;
      },
      setZipPasswordAttempts: (value) => {
        state.zipPasswordAttempts = value;
      },
      setZipConfirmIndex: (value) => {
        state.zipConfirmIndex = value;
      },
      setZipOverwriteConfirmed: (value) => {
        state.zipOverwriteConfirmed = value;
      },
      setZipModalOpen: (value) => {
        state.zipModalOpen = value;
      },
    },
  });
}
