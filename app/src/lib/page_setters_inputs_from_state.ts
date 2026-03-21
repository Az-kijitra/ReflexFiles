import { buildPageSettersInputsFromGroups } from "./page_setters_inputs_from_groups";

/**
 * @param {{
 *   state: any;
 *   setStatusTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 * }} params
 */
export function buildPageSettersInputsFromState(params) {
  const { state, setStatusTimer } = params;

  // In dual-pane mode, callers MUST provide getActivePane (DOM-focus-based).
  // Falling back to activePaneId is intentionally removed: it can be stale or
  // incorrect, causing setters to silently write to the wrong pane.
  const getActivePane = params.getActivePane ?? (() => state);

  // Shorthand: setter writing to global state
  const s = (field) => (value) => { state[field] = value; };
  // Shorthand: setter writing to whichever pane is currently active
  const ap = (field) => (value) => { getActivePane()[field] = value; };

  return buildPageSettersInputsFromGroups({
    paste: {
      setPasteConfirmOpen:  s("pasteConfirmOpen"),
      setPastePendingPaths: s("pastePendingPaths"),
      setPasteConflicts:    s("pasteConflicts"),
      setPasteConfirmIndex: s("pasteConfirmIndex"),
      setPasteMode:         s("pasteMode"),
      setPasteApplyAll:     s("pasteApplyAll"),
    },
    delete: {
      setDeleteConfirmOpen:  s("deleteConfirmOpen"),
      setDeleteTargets:      s("deleteTargets"),
      setDeleteError:        s("deleteError"),
      setDeleteConfirmIndex: s("deleteConfirmIndex"),
    },
    rename: {
      setRenameTarget: s("renameTarget"),
      setRenameValue:  s("renameValue"),
      setRenameError:  s("renameError"),
      setRenameOpen:   s("renameOpen"),
    },
    create: {
      setCreateType:  s("createType"),
      setCreateName:  s("createName"),
      setCreateError: s("createError"),
      setCreateOpen:  s("createOpen"),
    },
    jump: {
      setJumpUrlOpen:  s("jumpUrlOpen"),
      setJumpUrlError: s("jumpUrlError"),
      setJumpUrlValue: s("jumpUrlValue"),
      setJumpList:     s("jumpList"),
      setPathHistory:  s("pathHistory"),
    },
    search: {
      setSearchQuery:   s("searchQuery"),
      setSearchActive:  s("searchActive"),
      setSearchError:   s("searchError"),
      setSearchHistory: s("searchHistory"),
    },
    about: {
      setAboutOpen: s("aboutOpen"),
    },
    selection: {
      setFocusedIndex: ap("focusedIndex"),
      setSelected:     (paths) => { getActivePane().selectedPaths = paths; },
      setAnchorIndex:  ap("anchorIndex"),
    },
    contextMenu: {
      setContextMenuOpen:     s("contextMenuOpen"),
      setContextMenuPos:      s("contextMenuPos"),
      setContextMenuMode:     s("contextMenuMode"),
      setContextMenuCanPaste: s("contextMenuCanPaste"),
      setContextMenuIndex:    s("contextMenuIndex"),
    },
    dropdown: {
      setDropdownOpen: s("dropdownOpen"),
    },
    status: {
      setStatusMessageState: s("statusMessage"),
      setStatusTimer,
    },
    failure: {
      setError:             ap("error"),
      setFailureModalOpen:  s("failureModalOpen"),
      setFailureModalTitle: s("failureModalTitle"),
      setFailureItems:      s("failureItems"),
    },
    clipboard: {
      setLastClipboard: s("lastClipboard"),
    },
    undo: {
      setUndoStack: s("undoStack"),
      setRedoStack: s("redoStack"),
    },
    zip: {
      setZipMode:              s("zipMode"),
      setZipTargets:           s("zipTargets"),
      setZipDestination:       s("zipDestination"),
      setZipPassword:          s("zipPassword"),
      setZipError:             s("zipError"),
      setZipPasswordAttempts:  s("zipPasswordAttempts"),
      setZipConfirmIndex:      s("zipConfirmIndex"),
      setZipOverwriteConfirmed:s("zipOverwriteConfirmed"),
      setZipModalOpen:         s("zipModalOpen"),
    },
  });
}
