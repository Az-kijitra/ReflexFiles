import type { ActionId } from "$lib/ui_types";

/** All dependencies injected into the global keydown handler. */
export interface PageKeydownParams {
  // ── DOM refs ──────────────────────────────────────────────────────────────
  handleGlobalKey: (event: KeyboardEvent, ctx: unknown) => boolean;
  getListEl:        () => HTMLElement | null;
  getPathInputEl:   () => HTMLInputElement | null;
  getTreeEl:        () => HTMLElement | null;
  getDropdownEl:    () => HTMLElement | null;
  getContextMenuEl: () => HTMLElement | null;

  // ── Modal open-state getters ──────────────────────────────────────────────
  getPasteConfirmOpen:  () => boolean;
  getDeleteConfirmOpen: () => boolean;
  getJumpUrlOpen:       () => boolean;
  getSortMenuOpen:      () => boolean;
  getZipModalOpen:      () => boolean;
  getFailureModalOpen:  () => boolean;
  getDropdownOpen:      () => boolean;
  getRenameOpen:        () => boolean;
  getCreateOpen:        () => boolean;
  getPropertiesOpen:    () => boolean;
  getContextMenuOpen:   () => boolean;

  // ── UI-state getters ──────────────────────────────────────────────────────
  getShowTree:     () => boolean;
  getShowHidden:   () => boolean;
  getShowSize:     () => boolean;
  getShowTime:     () => boolean;
  getSearchActive: () => boolean;

  // ── Data getters ──────────────────────────────────────────────────────────
  getCurrentPath:  () => string;
  getDropdownMode: () => string;
  getEntries:      () => unknown[];
  getFocusedIndex: () => number;
  getListRows:     () => number;
  getSelectedPaths: () => string[];
  getJumpList:     () => unknown[];
  getPathHistory:  () => string[];
  getMenuOpen:     () => string;
  getExternalApps: () => unknown[];
  getTargetEntry:  () => unknown;

  // ── Keymap helpers ────────────────────────────────────────────────────────
  matchesAction:       (event: KeyboardEvent, actionId: ActionId) => boolean;
  eventToKeyString:    (event: KeyboardEvent) => string;
  normalizeKeyString:  (value: string) => string;

  // ── Focus / navigation ────────────────────────────────────────────────────
  focusTreeTop:      () => void;
  focusList:         () => void;
  focusPathInput:    () => void;
  updateListRows:    () => void;
  moveFocusByRow:    (delta: number, useRange: boolean) => void;
  moveFocusByColumn: (delta: number, useRange: boolean) => void;

  // ── Rename ────────────────────────────────────────────────────────────────
  cancelRename:  () => void;
  confirmRename: () => void;
  openRename:    () => void;

  // ── Create ────────────────────────────────────────────────────────────────
  cancelCreate:  () => void;
  confirmCreate: () => void;
  openCreate:    () => void;

  // ── Jump URL ──────────────────────────────────────────────────────────────
  cancelJumpUrl:  () => void;
  confirmJumpUrl: () => void;

  // ── Properties / menus ───────────────────────────────────────────────────
  closeProperties:      () => void;
  openProperties:       (path: string) => Promise<void>;
  closeMenu:            () => void;
  openSortMenu:         () => void;
  closeSortMenu:        () => void;
  openJumpUrlModal:     () => void;
  addJumpCurrent:       () => void;

  // ── Key handlers (sub-handlers) ───────────────────────────────────────────
  handleSortMenuKey:   (event: KeyboardEvent) => void;
  handleContextMenuKey:(event: KeyboardEvent) => void;
  handleTreeKey:       (event: KeyboardEvent) => void;

  // ── Selection ─────────────────────────────────────────────────────────────
  toggleSelection: (index: number) => void;
  selectRange:     (start: number, end: number) => void;
  selectAll:       () => void;
  setSelected:     (paths: string[]) => void;
  setAnchorIndex:  (value: number | null) => void;

  // ── Clipboard ─────────────────────────────────────────────────────────────
  copySelected:       () => void;
  duplicateSelected:  () => void;
  prefixDateSelected: () => void;
  cutSelected:        () => void;
  pasteItems:         () => void;

  // ── Capability checks ─────────────────────────────────────────────────────
  hasOperationTargets:       () => boolean;
  hasSelection:              () => boolean;
  canCopyTargets:            () => boolean;
  canDuplicateTargets:       () => boolean;
  canPrefixDateTargets:      () => boolean;
  canCutTargets:             () => boolean;
  canRenameFocused:          () => boolean;
  canDeleteSelection:        () => boolean;
  canDeleteTargets:          () => boolean;
  canOpenPropertiesSelection:() => boolean;
  canZipCreateSelection:     () => boolean;
  canZipExtractSelection:    () => boolean;
  canZipExtractFocused:      () => boolean;

  // ── Entry operations ──────────────────────────────────────────────────────
  openEntry:   (entry: unknown) => void;
  openContextMenu: (...args: unknown[]) => void;
  loadDir:     (path: string) => Promise<void>;
  buildTreeRoot:(path: string) => Promise<void>;

  // ── External apps ─────────────────────────────────────────────────────────
  openInExplorer:           () => void;
  openInCmd:                () => void;
  openInTerminalCmd:        () => void;
  openInTerminalPowerShell: () => void;
  openInTerminalWsl:        () => void;
  openInVSCode:             () => void;
  openInGitClient:          () => void;
  runExternalApp:           (app: unknown) => void;

  // ── Zip ───────────────────────────────────────────────────────────────────
  openZipCreate:   () => void;
  openZipExtract:  () => void;

  // ── Undo / redo ───────────────────────────────────────────────────────────
  performUndo: () => void;
  performRedo: () => void;

  // ── Misc ──────────────────────────────────────────────────────────────────
  clearDirStatsCache:  () => void;
  openConfigFile:      () => void;
  openKeymapHelp:      () => void;
  setStatusMessage:    (message: string, durationMs?: number) => void;
  setDropdownMode:     (value: string) => void;
  setDropdownOpen:     (value: boolean) => void;
  setSearchActive:     (value: boolean) => void;
  setPathInput:        (value: string) => void;
  setShowHidden:       (value: boolean) => void;
  setShowSize:         (value: boolean) => void;
  setShowTime:         (value: boolean) => void;
  setShowTree:         (value: boolean) => void;
  setDeleteTargets:    (value: string[]) => void;
  setDeleteConfirmOpen:(value: boolean) => void;
  setDeleteConfirmIndex:(value: number) => void;
  setDeleteError:      (value: string) => void;
  setPathHistory:      (value: string[]) => void;
  scheduleUiSave:      (delay?: number) => void;
  showError:           (err: unknown) => void;
  exitApp:             () => void;
  t:                   (key: string, vars?: Record<string, string | number>) => string;
  confirm:             (question: string) => Promise<boolean>;
}
