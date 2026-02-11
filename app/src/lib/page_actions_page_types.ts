/**
 * @param {{
 *   state: {
 *     pastePendingPaths: string[];
 *     pasteConflicts: any[];
 *     pasteMode: string;
 *     deleteTargets: string[];
 *     renameTarget: string;
 *     renameValue: string;
 *     createType: "file" | "folder";
 *     createName: string;
 *     jumpUrlValue: string;
 *     jumpList: string[];
 *     pathHistory: string[];
 *     searchQuery: string;
 *     searchHistory: string[];
 *     externalAppAssociations: Record<string, string>;
 *     externalApps: any[];
 *     contextMenuOpen: boolean;
 *     contextMenuPos: { x: number; y: number } | null;
 *     contextMenuMode: string;
 *     contextMenuCanPaste: boolean;
 *     contextMenuIndex: number;
 *     lastClipboard: { paths: string[]; cut: boolean };
 *     dropdownOpen: boolean;
 *     statusMessage: string;
 *     statusTimer: ReturnType<typeof setTimeout> | null;
 *     error: string;
 *     failureModalOpen: boolean;
 *     failureModalTitle: string;
 *     failureItems: any[];
 *     pasteApplyAll: boolean;
 *     currentPath: string;
 *     entries: any[];
 *     focusedIndex: number;
 *     selectedPaths: string[];
 *     undoStack: any[];
 *     redoStack: any[];
 *     zipMode: string;
 *     zipTargets: string[];
 *     zipDestination: string;
 *     zipPassword: string;
 *     zipPasswordAttempts: number;
 *     zipOverwriteConfirmed: boolean;
 *   };
 *   set: {
 *     paste: {
 *       setPasteConfirmOpen: (value: boolean) => void;
 *       setPastePendingPaths: (value: string[]) => void;
 *       setPasteConflicts: (value: any[]) => void;
 *       setPasteConfirmIndex: (value: number) => void;
 *       setPasteMode: (value: string) => void;
 *       setPasteApplyAll: (value: boolean) => void;
 *     };
 *     delete: {
 *       setDeleteConfirmOpen: (value: boolean) => void;
 *       setDeleteTargets: (value: string[]) => void;
 *       setDeleteError: (value: string) => void;
 *       setDeleteConfirmIndex: (value: number) => void;
 *     };
 *     rename: {
 *       setRenameTarget: (value: string) => void;
 *       setRenameValue: (value: string) => void;
 *       setRenameError: (value: string) => void;
 *       setRenameOpen: (value: boolean) => void;
 *     };
 *     create: {
 *       setCreateType: (value: "file" | "folder") => void;
 *       setCreateName: (value: string) => void;
 *       setCreateError: (value: string) => void;
 *       setCreateOpen: (value: boolean) => void;
 *     };
 *     jump: {
 *       setJumpUrlOpen: (value: boolean) => void;
 *       setJumpUrlError: (value: string) => void;
 *       setJumpUrlValue: (value: string) => void;
 *       setJumpList: (value: string[]) => void;
 *       setPathHistory: (value: string[]) => void;
 *     };
 *     search: {
 *       setSearchQuery: (value: string) => void;
 *       setSearchActive: (value: boolean) => void;
 *       setSearchError: (value: string) => void;
 *       setSearchHistory: (value: string[]) => void;
 *     };
 *     about: {
 *       setAboutOpen: (value: boolean) => void;
 *     };
 *     selection: {
 *       setFocusedIndex: (value: number) => void;
 *       setSelected: (paths: string[]) => void;
 *       setAnchorIndex: (value: number) => void;
 *     };
 *     contextMenu: {
 *       setContextMenuOpen: (value: boolean) => void;
 *       setContextMenuPos: (value: { x: number; y: number } | null) => void;
 *       setContextMenuMode: (value: string) => void;
 *       setContextMenuCanPaste: (value: boolean) => void;
 *       setContextMenuIndex: (value: number) => void;
 *     };
 *     dropdown: {
 *       setDropdownOpen: (value: boolean) => void;
 *     };
 *     status: {
 *       setStatusMessageState: (value: string) => void;
 *       setStatusTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     };
 *     failure: {
 *       setError: (value: string) => void;
 *       setFailureModalOpen: (value: boolean) => void;
 *       setFailureModalTitle: (value: string) => void;
 *       setFailureItems: (value: any[]) => void;
 *     };
 *     clipboard: {
 *       setLastClipboard: (value: { paths: string[]; cut: boolean }) => void;
 *     };
 *     undo: {
 *       setUndoStack: (value: any[]) => void;
 *       setRedoStack: (value: any[]) => void;
 *     };
 *     zip: {
 *       setZipMode: (value: string) => void;
 *       setZipTargets: (value: string[]) => void;
 *       setZipDestination: (value: string) => void;
 *       setZipPassword: (value: string) => void;
 *       setZipError: (value: string) => void;
 *       setZipPasswordAttempts: (value: number) => void;
 *       setZipConfirmIndex: (value: number) => void;
 *       setZipOverwriteConfirmed: (value: boolean) => void;
 *       setZipModalOpen: (value: boolean) => void;
 *     };
 *   };
 *   refs: {
 *     getDeleteModalEl: () => HTMLElement | null;
 *     getRenameInputEl: () => HTMLInputElement | null;
 *     getRenameModalEl: () => HTMLElement | null;
 *     getCreateInputEl: () => HTMLInputElement | null;
 *     getCreateModalEl: () => HTMLElement | null;
 *     getJumpUrlInputEl: () => HTMLInputElement | null;
 *     getJumpUrlModalEl: () => HTMLElement | null;
 *     getContextMenuEl: () => HTMLElement | null;
 *     getDropdownEl: () => HTMLElement | null;
 *   };
 *   deps: {
 *     scheduleUiSave: () => void;
 *     loadDir: (path: string) => Promise<void>;
 *     moveFocusByRow: (delta: number, useRange: boolean) => void;
 *     undoLimit: number;
 *     zipPasswordMaxAttempts: number;
 *   };
 * }} params
 */

export type PageActionsPageParams = Record<string, unknown>;
