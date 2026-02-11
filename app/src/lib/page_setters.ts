/**
 * @param {{
 *   setPasteConfirmOpen: (value: boolean) => void;
 *   setPastePendingPaths: (value: string[]) => void;
 *   setPasteConflicts: (value: any[]) => void;
 *   setPasteConfirmIndex: (value: number) => void;
 *   setPasteMode: (value: string) => void;
 *   setPasteApplyAll: (value: boolean) => void;
 *   setDeleteConfirmOpen: (value: boolean) => void;
 *   setDeleteTargets: (value: string[]) => void;
 *   setDeleteError: (value: string) => void;
 *   setDeleteConfirmIndex: (value: number) => void;
 *   setRenameTarget: (value: string) => void;
 *   setRenameValue: (value: string) => void;
 *   setRenameError: (value: string) => void;
 *   setRenameOpen: (value: boolean) => void;
 *   setCreateType: (value: "file" | "folder") => void;
 *   setCreateName: (value: string) => void;
 *   setCreateError: (value: string) => void;
 *   setCreateOpen: (value: boolean) => void;
 *   setJumpUrlOpen: (value: boolean) => void;
 *   setJumpUrlError: (value: string) => void;
 *   setJumpUrlValue: (value: string) => void;
 *   setJumpList: (value: string[]) => void;
 *   setPathHistory: (value: string[]) => void;
 *   setSearchQuery: (value: string) => void;
 *   setSearchActive: (value: boolean) => void;
 *   setSearchError: (value: string) => void;
 *   setSearchHistory: (value: string[]) => void;
 *   setAboutOpen: (value: boolean) => void;
 *   setFocusedIndex: (value: number) => void;
 *   setSelected: (paths: string[]) => void;
 *   setAnchorIndex: (value: number) => void;
 *   setContextMenuOpen: (value: boolean) => void;
 *   setContextMenuPos: (value: { x: number; y: number } | null) => void;
 *   setContextMenuMode: (value: string) => void;
 *   setContextMenuCanPaste: (value: boolean) => void;
 *   setContextMenuIndex: (value: number) => void;
 *   setDropdownOpen: (value: boolean) => void;
 *   setStatusMessageState: (value: string) => void;
 *   setStatusTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *   setError: (value: string) => void;
 *   setFailureModalOpen: (value: boolean) => void;
 *   setFailureModalTitle: (value: string) => void;
 *   setFailureItems: (value: any[]) => void;
 *   setLastClipboard: (value: { paths: string[]; cut: boolean }) => void;
 *   setUndoStack: (value: any[]) => void;
 *   setRedoStack: (value: any[]) => void;
 *   setZipMode: (value: string) => void;
 *   setZipTargets: (value: string[]) => void;
 *   setZipDestination: (value: string) => void;
 *   setZipPassword: (value: string) => void;
 *   setZipError: (value: string) => void;
 *   setZipPasswordAttempts: (value: number) => void;
 *   setZipConfirmIndex: (value: number) => void;
 *   setZipOverwriteConfirmed: (value: boolean) => void;
 *   setZipModalOpen: (value: boolean) => void;
 * }} setters
 */
export function buildPageSetters(setters) {
  const {
    setPasteConfirmOpen,
    setPastePendingPaths,
    setPasteConflicts,
    setPasteConfirmIndex,
    setPasteMode,
    setPasteApplyAll,
    setDeleteConfirmOpen,
    setDeleteTargets,
    setDeleteError,
    setDeleteConfirmIndex,
    setRenameTarget,
    setRenameValue,
    setRenameError,
    setRenameOpen,
    setCreateType,
    setCreateName,
    setCreateError,
    setCreateOpen,
    setJumpUrlOpen,
    setJumpUrlError,
    setJumpUrlValue,
    setJumpList,
    setPathHistory,
    setSearchQuery,
    setSearchActive,
    setSearchError,
    setSearchHistory,
    setAboutOpen,
    setFocusedIndex,
    setSelected,
    setAnchorIndex,
    setContextMenuOpen,
    setContextMenuPos,
    setContextMenuMode,
    setContextMenuCanPaste,
    setContextMenuIndex,
    setDropdownOpen,
    setStatusMessageState,
    setStatusTimer,
    setError,
    setFailureModalOpen,
    setFailureModalTitle,
    setFailureItems,
    setLastClipboard,
    setUndoStack,
    setRedoStack,
    setZipMode,
    setZipTargets,
    setZipDestination,
    setZipPassword,
    setZipError,
    setZipPasswordAttempts,
    setZipConfirmIndex,
    setZipOverwriteConfirmed,
    setZipModalOpen,
  } = setters;

  return {
    paste: {
      setPasteConfirmOpen,
      setPastePendingPaths,
      setPasteConflicts,
      setPasteConfirmIndex,
      setPasteMode,
      setPasteApplyAll,
    },
    delete: {
      setDeleteConfirmOpen,
      setDeleteTargets,
      setDeleteError,
      setDeleteConfirmIndex,
    },
    rename: {
      setRenameTarget,
      setRenameValue,
      setRenameError,
      setRenameOpen,
    },
    create: {
      setCreateType,
      setCreateName,
      setCreateError,
      setCreateOpen,
    },
    jump: {
      setJumpUrlOpen,
      setJumpUrlError,
      setJumpUrlValue,
      setJumpList,
      setPathHistory,
    },
    search: {
      setSearchQuery,
      setSearchActive,
      setSearchError,
      setSearchHistory,
    },
    about: {
      setAboutOpen,
    },
    selection: {
      setFocusedIndex,
      setSelected,
      setAnchorIndex,
    },
    contextMenu: {
      setContextMenuOpen,
      setContextMenuPos,
      setContextMenuMode,
      setContextMenuCanPaste,
      setContextMenuIndex,
    },
    dropdown: {
      setDropdownOpen,
    },
    status: {
      setStatusMessageState,
      setStatusTimer,
    },
    failure: {
      setError,
      setFailureModalOpen,
      setFailureModalTitle,
      setFailureItems,
    },
    clipboard: {
      setLastClipboard,
    },
    undo: {
      setUndoStack,
      setRedoStack,
    },
    zip: {
      setZipMode,
      setZipTargets,
      setZipDestination,
      setZipPassword,
      setZipError,
      setZipPasswordAttempts,
      setZipConfirmIndex,
      setZipOverwriteConfirmed,
      setZipModalOpen,
    },
  };
}
