/**
 * @param {{
 *   paste: {
 *     pastePendingPaths: string[];
 *     pasteConflicts: any[];
 *     pasteMode: string;
 *     pasteApplyAll: boolean;
 *   };
 *   delete: {
 *     deleteTargets: string[];
 *   };
 *   rename: {
 *     renameTarget: string;
 *     renameValue: string;
 *   };
 *   create: {
 *     createType: "file" | "folder";
 *     createName: string;
 *   };
 *   jump: {
 *     jumpUrlValue: string;
 *     jumpList: string[];
 *     pathHistory: string[];
 *   };
 *   search: {
 *     searchQuery: string;
 *     searchHistory: string[];
 *   };
 *   external: {
 *     externalAppAssociations: Record<string, string>;
 *     externalApps: any[];
 *   };
 *   contextMenu: {
 *     contextMenuOpen: boolean;
 *     contextMenuPos: { x: number; y: number } | null;
 *     contextMenuMode: string;
 *     contextMenuCanPaste: boolean;
 *     contextMenuIndex: number;
 *   };
 *   clipboard: {
 *     lastClipboard: { paths: string[]; cut: boolean };
 *   };
 *   dropdown: {
 *     dropdownOpen: boolean;
 *   };
 *   status: {
 *     statusMessage: string;
 *     statusTimer: ReturnType<typeof setTimeout> | null;
 *   };
 *   failure: {
 *     error: string;
 *     failureModalOpen: boolean;
 *     failureModalTitle: string;
 *     failureItems: any[];
 *   };
 *   listing: {
 *     currentPath: string;
 *     entries: any[];
 *     focusedIndex: number;
 *     selectedPaths: string[];
 *   };
 *   undo: {
 *     undoStack: any[];
 *     redoStack: any[];
 *   };
 *   zip: {
 *     zipMode: string;
 *     zipTargets: string[];
 *     zipDestination: string;
 *     zipPassword: string;
 *     zipPasswordAttempts: number;
 *     zipOverwriteConfirmed: boolean;
 *   };
 * }} params
 */

export type PageActionsContextParams = Record<string, any>;
