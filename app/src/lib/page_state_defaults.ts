/** Default state shape for the right pane in dual-pane mode. */
export function createRightPaneDefaults() {
  return {
    // ── Navigation ────────────────────────────────────────────────────────────
    currentPath: "",
    currentPathCapabilities: {
      can_read: true,
      can_create: true,
      can_rename: true,
      can_copy: true,
      can_move: true,
      can_delete: true,
      can_archive_create: true,
      can_archive_extract: true,
    },
    entries: [],
    filteredEntries: [],
    loading: false,
    error: "",

    // ── Selection ─────────────────────────────────────────────────────────────
    selectedPaths: [],
    focusedIndex: 0,
    anchorIndex: null,

    // ── Path bar ──────────────────────────────────────────────────────────────
    pathInput: "",
    pathCompletionPreviewActive: false,

    // ── Search ───────────────────────────────────────────────────────────────
    searchQuery: "",
    searchActive: false,
    searchRegex: false,
    searchError: "",

    // ── List layout ───────────────────────────────────────────────────────────
    listRows: 20,
    listCols: 1,
    visibleColStart: 0,
    visibleColEnd: 0,
    nameMaxChars: 24,
    overflowLeft: false,
    overflowRight: false,

    // ── Dropdown ─────────────────────────────────────────────────────────────
    dropdownOpen: false,
    dropdownMode: "history",
    dropdownItems: [],
    dropdownIndex: 0,

    // ── Git ───────────────────────────────────────────────────────────────────
    gitStatus: null as import("$lib/utils/tauri_git").GitRepoStatus | null,
  };
}

export function createPageStateDefaults() {
  return {
    // ── Navigation ────────────────────────────────────────────────────────────
    currentPath: "",
    currentPathCapabilities: {
      can_read: true,
      can_create: true,
      can_rename: true,
      can_copy: true,
      can_move: true,
      can_delete: true,
      can_archive_create: true,
      can_archive_extract: true,
    },
    entries: [],
    loading: false,
    error: "",
    selectedPaths: [],
    focusedIndex: 0,
    anchorIndex: null,
    pathInput: "",
    pathCompletionPreviewActive: false,

    // ── Search ───────────────────────────────────────────────────────────────
    searchQuery: "",
    searchActive: false,
    searchRegex: false,
    searchError: "",
    searchHistory: [],
    filteredEntries: [],

    // ── List layout ───────────────────────────────────────────────────────────
    nameMaxChars: 24,
    listRows: 1,
    listCols: 1,
    visibleColStart: 0,
    visibleColEnd: 0,
    overflowLeft: false,
    overflowRight: false,

    // ── Sorting ───────────────────────────────────────────────────────────────
    sortKey: "name",
    sortOrder: "asc",
    sortMenuOpen: false,
    sortMenuIndex: 0,

    // ── Path bar / dropdown ───────────────────────────────────────────────────
    dropdownOpen: false,
    dropdownMode: "history",
    dropdownItems: [],
    dropdownIndex: 0,

    // ── Jump list ─────────────────────────────────────────────────────────────
    jumpList: [],
    jumpUrlOpen: false,
    jumpUrlValue: "",
    jumpUrlError: "",

    // ── Path history ──────────────────────────────────────────────────────────
    pathHistory: [],

    // ── Context menu ─────────────────────────────────────────────────────────
    contextMenuOpen: false,
    contextMenuPos: { x: 0, y: 0 },
    contextMenuMode: "blank",
    contextMenuCanPaste: false,
    contextMenuIndex: -1,
    menuOpen: "",

    // ── Modals: delete ────────────────────────────────────────────────────────
    deleteConfirmOpen: false,
    deleteTargets: [],
    deleteConfirmIndex: 1,
    deleteError: "",

    // ── Modals: paste ─────────────────────────────────────────────────────────
    pasteConfirmOpen: false,
    pasteConflicts: [],
    pasteApplyAll: true,
    pasteMode: "copy",
    pastePendingPaths: [],
    pasteConfirmIndex: 0,

    // ── Modals: rename ────────────────────────────────────────────────────────
    renameOpen: false,
    renameTarget: "",
    renameValue: "",
    renameError: "",

    // ── Modals: create ────────────────────────────────────────────────────────
    createOpen: false,
    createType: "file",
    createName: "",
    createError: "",

    // ── Modals: properties ────────────────────────────────────────────────────
    propertiesOpen: false,
    propertiesData: null,
    propertiesPath: "",

    // ── Modals: zip ───────────────────────────────────────────────────────────
    zipModalOpen: false,
    zipMode: "create",
    zipDestination: "",
    zipPassword: "",
    zipTargets: [],
    zipError: "",
    zipPasswordAttempts: 0,
    zipConfirmIndex: 0,
    zipOverwriteConfirmed: false,

    // ── Modals: failure list ──────────────────────────────────────────────────
    failureModalOpen: false,
    failureModalTitle: "",
    failureItems: [],

    // ── Modals: about ─────────────────────────────────────────────────────────
    aboutOpen: false,

    // ── Status bar ────────────────────────────────────────────────────────────
    statusItems: [],
    statusMessage: "",

    // ── Tree panel ────────────────────────────────────────────────────────────
    showTree: true,
    treeRoot: null,
    treeFocusedIndex: 0,
    treeSelectedPath: "",
    treeLoading: false,

    // ── Clipboard ─────────────────────────────────────────────────────────────
    lastClipboard: { paths: [], cut: false },
    clipboardPreviewVisible: false,
    clipboardItemsMeta: [] as Array<{ path: string; name: string; modified: string | null; isDir: boolean }>,

    // ── Undo / redo ───────────────────────────────────────────────────────────
    undoStack: [],
    redoStack: [],

    // ── Git ───────────────────────────────────────────────────────────────────
    gitStatus: null as import("$lib/utils/tauri_git").GitRepoStatus | null,
    gitPanelOpen: false,

    // ── Display options ───────────────────────────────────────────────────────
    showHidden: false,
    showSize: true,
    showTime: false,

    // ── UI settings ───────────────────────────────────────────────────────────
    ui_theme: "light",
    ui_language: "en",
    ui_file_icon_mode: "by_type",

    // ── Keymap ────────────────────────────────────────────────────────────────
    keymapProfile: "windows",
    keymapCustom: {},
    externalAppAssociations: {},
    externalApps: [],

    // ── Dir stats ─────────────────────────────────────────────────────────────
    dirStatsTimeoutMs: 3000,
    dirStatsInFlight: false,
    dirStatsCacheKeys: [],

    // ── Config / logging ──────────────────────────────────────────────────────
    loggingEnabled: true,
    logFile: "",
    uiConfigLoaded: false,

    // ── Window ────────────────────────────────────────────────────────────────
    windowBounds: { x: 0, y: 0, width: 0, height: 0, maximized: false },
    windowBoundsReady: false,

    // ── Dual-pane layout ──────────────────────────────────────────────────────
    layoutMode: "single",
    activePaneId: "left",
    rightPane: createRightPaneDefaults(),
  };
}
