<script>
  import { onMount, tick } from "svelte";
  import "../app.css";

  import {
    getCurrentWindow,
    homeDir,
    invoke,
    listen,
    openUrl,
  } from "$lib/tauri_client";

  import { EVENT_FS_CHANGED, EVENT_OP_PROGRESS } from "$lib/events";
  import { KEYMAP_ACTIONS, MENU_GROUPS } from "$lib/ui_constants";
  import { fsGetCapabilities } from "$lib/utils/tauri_fs";

  import { formatModified, formatName, formatSize } from "$lib/utils/format";
  import { formatError } from "$lib/utils/error_format";
  import { eventToKeyString, normalizeKeyString } from "$lib/utils/keymap";
  import { handleGlobalKey } from "$lib/utils/keyboard_global";
  import { getVisibleTreeNodes, treeNodeName } from "$lib/utils/tree";

  import {
    ABOUT_LICENSE,
    ABOUT_URL,
    DIR_STATS_CACHE_LIMIT,
    GIT_PANEL_WIDTH,
    UNDO_LIMIT,
    UNDO_SAVE_DEBOUNCE_MS,
    ZIP_PASSWORD_MAX_ATTEMPTS,
  } from "$lib/page_constants";
  import { createDirStatsCache } from "$lib/page_dir_stats_cache";
  import { createPageEffectsRuntime } from "$lib/page_effects_runtime";
  import {
    applyThemeEffect,
    focusModalInputOnOpen,
    focusModalOnOpen,
    focusPropertiesOnOpen,
    setupContextMenuKeydown,
    trapModalFocus,
  } from "$lib/page_effects";
  import { applyDropdownEffects, applyListLayoutEffects } from "$lib/page_effects_apply";
  import { createPageErrorHandler } from "$lib/page_error_handler";
  import { autofocus, createListNameFormatter, createTranslator, normalizeProviderCapabilities } from "$lib/page_helpers";
  import { createDirHelpers } from "$lib/page_dir";
  import { setupPageInitFromState } from "$lib/page_init_runtime";
  import { buildInitPageRuntimeInputsFromPageState } from "$lib/page_init_runtime_inputs_from_page_state";
  import { setupPageActionsRuntimeFromState } from "$lib/page_actions_runtime_from_state";
  import { buildPageViewRuntimeBundleInputsFromState } from "$lib/page_view_runtime_bundle_inputs_from_state";
  import { createPageStateDefaults } from "$lib/page_state_defaults";
  import { createPageViewRuntimeBundle } from "$lib/page_view_runtime_bundle";
  import { createListLayoutHelpers } from "$lib/page_list_layout";
  import { createViewRuntime } from "$lib/page_view_runtime";
  import { buildViewRuntimeInputsFromState } from "$lib/page_view_runtime_inputs_from_state";
  import { createPageMountRuntime } from "$lib/page_mount_runtime";
  import { buildPageMountRuntimeInputsFromPageState } from "$lib/page_mount_runtime_inputs_from_page_state";
  import {
    buildPageMountHandlersFromState,
    buildPageMountHandlersInputsFromState,
  } from "$lib/page_mount_handlers_inputs_from_state";
  import { buildPageEffectsRuntimeInputsFromState } from "$lib/page_effects_runtime_inputs_from_state";
  import {
    applyModalFocuses,
    applyModalInputFocuses,
    applyModalTraps,
  } from "$lib/page_modal_effects";
  import { trapModalTab } from "$lib/page_trap";
  import { createPageActionPlaceholders } from "$lib/page_action_placeholders";
  import { createKeymapBindingsState } from "$lib/page_keymap_bindings_state";
  import { createListFocusMovers } from "$lib/page_list_focus";
  import { selectRangeByIndex } from "$lib/utils/selection";
  import { isPaneFocused } from "$lib/pane_focus_utils";
  import { createSettingsActions } from "$lib/page_settings_actions";
  import { normalizeSettingsSection } from "$lib/page_settings_logic";
  import { createGitPanelHandlers } from "$lib/page_git_panel_logic";
  import {
    createDualPaneFocusHandlers,
    createDualPaneToggleHandler,
    createWinMergeCrossPaneHandler,
  } from "$lib/page_dual_pane_handlers";
  import {
    captureClipboardMeta,
    patchPasteItemsForPreview,
    makeClipboardEscHandler,
  } from "$lib/page_clipboard_preview_runtime";

  import PageShellBindings from "$lib/components/PageShellBindings.svelte";
  import SettingsModal from "$lib/components/modals/SettingsModal.svelte";
  import ClipboardPreview from "$lib/components/ClipboardPreview.svelte";
  import GitPanel from "$lib/components/GitPanel.svelte";
  import { gitGetStatus, getEntryGitBadge } from "$lib/utils/tauri_git";
  import { winmergeCompareFiles } from "$lib/utils/tauri_winmerge";

  const defaults = createPageStateDefaults();

  /** @typedef {ReturnType<typeof createPageStateDefaults>} PageState */
  /** @type {PageState} */
  let state = $state(defaults);

  /** @typedef {{ kind: "copy", pairs: { from: string, to: string }[] }} UndoCopy */
  /** @typedef {{ kind: "move", pairs: { from: string, to: string }[] }} UndoMove */
  /** @typedef {{ kind: "rename", from: string, to: string }} UndoRename */
  /** @typedef {{ kind: "create", path: string, createKind: "file" | "folder" }} UndoCreate */
  /** @typedef {{ kind: "delete", pairs: { from: string, to: string }[] }} UndoDelete */
  /** @typedef {UndoCopy | UndoMove | UndoRename | UndoCreate | UndoDelete} UndoEntry */

  function normalizeUndoPairs(rawPairs) {
    if (!Array.isArray(rawPairs)) return [];
    const pairs = [];
    for (const pair of rawPairs) {
      const from = typeof pair?.from === "string" ? pair.from.trim() : "";
      const to = typeof pair?.to === "string" ? pair.to.trim() : "";
      if (!from || !to) continue;
      pairs.push({ from, to });
    }
    return pairs;
  }

  /** @returns {UndoEntry | null} */
  function normalizeUndoEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const kind = String(entry.kind || "").trim();

    if (kind === "copy" || kind === "move" || kind === "delete") {
      const pairs = normalizeUndoPairs(entry.pairs);
      if (!pairs.length) return null;
      return { kind, pairs };
    }

    if (kind === "rename") {
      const from = typeof entry.from === "string" ? entry.from.trim() : "";
      const to = typeof entry.to === "string" ? entry.to.trim() : "";
      if (!from || !to) return null;
      return { kind: "rename", from, to };
    }

    if (kind === "create") {
      const path = typeof entry.path === "string" ? entry.path.trim() : "";
      const createKind = entry.createKind === "folder" ? "folder" : "file";
      if (!path) return null;
      return { kind: "create", path, createKind };
    }

    return null;
  }

  function normalizeUndoEntries(entries) {
    if (!Array.isArray(entries)) return [];
    const next = [];
    for (const entry of entries) {
      const normalized = normalizeUndoEntry(entry);
      if (normalized) {
        next.push(normalized);
      }
      if (next.length >= UNDO_LIMIT) break;
    }
    return next;
  }

  /** @type {() => Promise<void>} */
  let updateWindowBounds = async () => {};

  /** @type {number} */
  let dirStatsRequestId = 0;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let uiSaveTimer = null;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let undoSessionSaveTimer = null;
  let undoSessionLoaded = false;

  const { cacheGetDirStats, cacheSetDirStats, clearDirStatsCache } =
    createDirStatsCache(DIR_STATS_CACHE_LIMIT);

  /** @type {ReturnType<typeof setTimeout> | null} */
  let statusTimer = null;

  const t = createTranslator(() => state.ui_language);
  let testCapabilityOverride = null;

  let shellRefs = $state({
    /** @type {HTMLElement | null} */
    menuBarEl: null,
    /** @type {HTMLElement | null} */
    listEl: null,
    /** @type {HTMLElement | null} */
    listBodyEl: null,
    /** @type {HTMLElement | null} */
    treeEl: null,
    /** @type {HTMLElement | null} */
    treeBodyEl: null,
    /** @type {HTMLInputElement | null} */
    pathInputEl: null,
  });
  let rightShellRefs = $state({
    /** @type {HTMLElement | null} */
    listEl: null,
    /** @type {HTMLElement | null} */
    listBodyEl: null,
    /** @type {HTMLInputElement | null} */
    pathInputEl: null,
  });
  const overlayRefs = $state({
    /** @type {HTMLElement | null} */
    dropdownEl: null,
    /** @type {HTMLInputElement | null} */
    searchInputEl: null,
    /** @type {HTMLElement | null} */
    sortMenuEl: null,
    /** @type {HTMLElement | null} */
    aboutModalEl: null,
    /** @type {HTMLElement | null} */
    deleteModalEl: null,
    /** @type {HTMLElement | null} */
    pasteModalEl: null,
    /** @type {HTMLElement | null} */
    createModalEl: null,
    /** @type {HTMLInputElement | null} */
    createInputEl: null,
    /** @type {HTMLElement | null} */
    jumpUrlModalEl: null,
    /** @type {HTMLInputElement | null} */
    jumpUrlInputEl: null,
    /** @type {HTMLElement | null} */
    renameModalEl: null,
    /** @type {HTMLInputElement | null} */
    renameInputEl: null,
    /** @type {HTMLElement | null} */
    propertiesModalEl: null,
    /** @type {HTMLButtonElement | null} */
    propertiesCloseButton: null,
    /** @type {HTMLElement | null} */
    zipModalEl: null,
    /** @type {HTMLElement | null} */
    contextMenuEl: null,
    /** @type {HTMLElement | null} */
    failureModalEl: null,
  });
  /** @type {HTMLElement | null} */
  let listHeaderEl = $state(null);

  /** @type {HTMLElement | null} */
  let settingsModalEl = $state(null);
  let settingsOpen = $state(false);
  let settingsInitialSection = $state("general");
  let settingsSaving = $state(false);
  let settingsError = $state("");
  let settingsTesting = $state(false);
  let settingsTestMessage = $state("");
  let settingsTestIsError = $state(false);
  let settingsReporting = $state(false);
  let settingsReportMessage = $state("");
  let settingsReportIsError = $state(false);
  /** @type {string[]} */
  let settingsShortcutConflicts = $state([]);
  /** @type {Array<{ name: string, guid: string, source: string, is_default: boolean }>} */
  let settingsProfiles = $state([]);
  let settingsInitial = $state({
    ui_theme: "light",
    ui_language: "en",
    ui_file_icon_mode: "by_type",
    perf_dir_stats_timeout_ms: 3000,
    external_vscode_path: "",
    external_git_client_path: "",
    external_terminal_profile: "",
    external_terminal_profile_cmd: "",
    external_terminal_profile_powershell: "",
    external_terminal_profile_wsl: "",
  });
  // Watch timers
  /** @type {ReturnType<typeof setTimeout> | null} */
  let watchTimer = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let watchRefreshTimer = null;
  /** @type {(err: unknown) => void} */
  let showErrorImpl = createPageErrorHandler({
    getStatusMessage: () => state.statusMessage,
    setStatusMessage: (value) => {
      state.statusMessage = value;
    },
    getStatusTimer: () => statusTimer,
    setStatusTimer: (value) => {
      statusTimer = value;
    },
    setError: (value) => {
      state.error = value;
    },
    t,
  });
  /** @type {(err: unknown) => void} */
  let showError = (err) => showErrorImpl(err);
  const { bindings: keymapBindings, setters: keymapSetters } = createKeymapBindingsState();
  const initPage = () =>
    setupPageInitFromState({
      deps: {
        invoke,
        tick,
      },
      state,
      ...buildInitPageRuntimeInputsFromPageState({
        state,
        shellRefs,
        overlayRefs,
        timers: {
          get: {
            uiSaveTimer: () => uiSaveTimer,
            watchTimer: () => watchTimer,
          },
          set: {
            uiSaveTimer: (value) => {
              uiSaveTimer = value;
            },
            watchTimer: (value) => {
              watchTimer = value;
            },
          },
        },
        actions,
        keymapSetters,
        t,
        showError,
      }),
    });
  const actions = createPageActionPlaceholders({
    setStatusMessage: (value) => {
      state.statusMessage = value;
    },
    showError: (err) => showErrorImpl(err),
  });

  initPage();

  const settingsActions = createSettingsActions({
    getSettingsState: () => ({ settingsSaving, settingsInitial }),
    setters: {
      setSettingsOpen:               (v) => { settingsOpen = v; },
      setSettingsInitialSection:     (v) => { settingsInitialSection = v; },
      setSettingsSaving:             (v) => { settingsSaving = v; },
      setSettingsError:              (v) => { settingsError = v; },
      setSettingsTesting:            (v) => { settingsTesting = v; },
      setSettingsTestMessage:        (v) => { settingsTestMessage = v; },
      setSettingsTestIsError:        (v) => { settingsTestIsError = v; },
      setSettingsReporting:          (v) => { settingsReporting = v; },
      setSettingsReportMessage:      (v) => { settingsReportMessage = v; },
      setSettingsReportIsError:      (v) => { settingsReportIsError = v; },
      setSettingsShortcutConflicts:  (v) => { settingsShortcutConflicts = v; },
      setSettingsProfiles:           (v) => { settingsProfiles = v; },
      setSettingsInitial:            (v) => { settingsInitial = v; },
    },
    getAppStateForSettingsFallback: () => ({
      ui_theme:         state.ui_theme,
      ui_language:      state.ui_language,
      ui_file_icon_mode: state.ui_file_icon_mode,
      dirStatsTimeoutMs: state.dirStatsTimeoutMs,
    }),
    applyStateChanges: (patch) => {
      state.ui_theme            = patch.ui_theme;
      state.ui_language         = patch.ui_language;
      state.ui_file_icon_mode   = patch.ui_file_icon_mode;
      state.dirStatsTimeoutMs   = patch.dirStatsTimeoutMs;
    },
    getCurrentPath:     () => state.currentPath,
    focusList:          () => shellRefs.listEl?.focus?.(),
    invoke,
    actions,
    t,
    getActionBindings:  (actionId) => keymapBindings.getActionBindings(actionId),
  });

  const gitPanelHandlers = createGitPanelHandlers({
    getLeftCurrentPath:  () => state.currentPath,
    getRightCurrentPath: () => state.rightPane.currentPath,
    setLeftGitStatus:    (v) => { state.gitStatus = v; },
    setRightGitStatus:   (v) => { state.rightPane.gitStatus = v; },
    getGitPanelOpen:     () => state.gitPanelOpen,
    setGitPanelOpen:     (v) => { state.gitPanelOpen = v; },
  });
  const { refreshLeftGitStatus, refreshRightGitStatus, openGitPanel, closeGitPanel } = gitPanelHandlers;

  const formatNameForList = createListNameFormatter(formatName, () => state.nameMaxChars);
  const invokeExit = () => invoke("app_exit").catch(() => getCurrentWindow().close());

  const pageMountHandlers = () =>
    buildPageMountHandlersFromState(
      buildPageMountHandlersInputsFromState({
        actions,
        pageActionGroups,
        propertiesExtras: { clearDirStatsCache },
        showError,
        exitApp: invokeExit,
        focusPathInput: () => {
          requestAnimationFrame(() => {
            const input = document.querySelector(".path-input input");
            if (input) {
              input.focus();
              input.select();
            }
          });
        },
      })
    );

  // Register Tab/pointer handlers BEFORE lifecycle keydown handler so stopImmediatePropagation works.
  // Logic lives in page_dual_pane_handlers.ts.
  const dualPaneFocusHandlers = createDualPaneFocusHandlers({
    getLayoutMode:   () => state.layoutMode,
    getActivePaneId: () => state.activePaneId,
    setActivePaneId: (v) => { state.activePaneId = v; },
    getLeftRefs:     () => shellRefs,
    getRightRefs:    () => rightShellRefs,
  });
  onMount(() => {
    const { handleDualModeTab, handleDualModePointerDown } = dualPaneFocusHandlers;
    window.addEventListener("keydown",    handleDualModeTab,         { capture: true });
    window.addEventListener("pointerdown", handleDualModePointerDown, { capture: true });
    return () => {
      window.removeEventListener("keydown",    handleDualModeTab,         { capture: true });
      window.removeEventListener("pointerdown", handleDualModePointerDown, { capture: true });
    };
  });

  const pageMountInputs = createPageMountRuntime({
    onMount,
    inputs: buildPageMountRuntimeInputsFromPageState({
      state: () => state,
      shellRefs: () => shellRefs,
      overlayRefs: () => overlayRefs,
      rightRefs: () => rightShellRefs,
      handlers: pageMountHandlers,
      actions: {
        setStatusMessage: actions.setStatusMessage,
        showError,
        loadDir: actions.loadDir,
        scheduleUiSave: actions.scheduleUiSave,
        saveUiStateNow: actions.saveUiStateNow,
        recomputeStatusItems: actions.recomputeStatusItems,
      },
      deps: {
        homeDir,
        invoke,
        listen,
        EVENT_FS_CHANGED,
        EVENT_OP_PROGRESS,
        getCurrentWindow,
        t,
      },
      stateGet: {
        watchRefreshTimer: () => watchRefreshTimer,
        updateWindowBounds: () => updateWindowBounds,
      },
      stateSet: {
        watchRefreshTimer: (value) => {
          watchRefreshTimer = value;
        },
        updateWindowBounds: (value) => {
          updateWindowBounds = value;
        },
      },
      helpers: () => ({
        handleGlobalKey,
        t,
        confirm,
        eventToKeyString,
        normalizeKeyString,
      }),
      constants: { KEYMAP_ACTIONS },
    }),
  });

  const { pageActions, pageActionGroups, showErrorAction } = setupPageActionsRuntimeFromState({
    state: () => state,
    actions,
    overlayRefs: () => overlayRefs,
    statusTimer,
    setStatusTimer: (value) => {
      statusTimer = value;
    },
    getLoadDir: () => actions.loadDir,
    getMoveFocusByRow: () => actions.moveFocusByRow,
    undoLimit: UNDO_LIMIT,
    zipPasswordMaxAttempts: ZIP_PASSWORD_MAX_ATTEMPTS,
    t,
    tick,
    invoke,
    invokeExit,
    showError,
    treeNodeName,
    keymapBindings,
    dirStatsRequestId: () => dirStatsRequestId,
    setDirStatsRequestId: (value) => {
      dirStatsRequestId = value;
    },
    cacheGetDirStats,
    cacheSetDirStats,
    getActivePane: () => isDualRightFocused() ? state.rightPane : state,
  });
  showErrorImpl = showErrorAction;

  // Right pane directory loading (uses its own loadSeq via createDirHelpers)
  const rightDirHelpers = createDirHelpers({
    invoke,
    getShowHidden: () => state.showHidden,
    getSortKey: () => state.sortKey,
    getSortOrder: () => state.sortOrder,
    setEntries: (v) => { state.rightPane.entries = v; },
    setCurrentPath: (v) => { state.rightPane.currentPath = v; },
    setPathInput: (v) => { state.rightPane.pathInput = v; },
    scheduleWatch: () => {},
    setSelectedPaths: (v) => { state.rightPane.selectedPaths = v; },
    setFocusedIndex: (v) => { state.rightPane.focusedIndex = v; },
    setAnchorIndex: (v) => { state.rightPane.anchorIndex = v; },
    getPathHistory: () => state.pathHistory,
    setPathHistory: (v) => { state.pathHistory = v; },
    scheduleUiSave: () => actions.scheduleUiSave(),
    getShowTree: () => false,
    buildTreeRoot: async () => {},
    clearTree: () => {},
    setLoading: (v) => { state.rightPane.loading = v; },
    setError: (v) => { state.rightPane.error = v; },
    showError,
  });

  // Right pane list layout helpers (fixes "only 1 item shown" issue)
  const rightListLayoutHelpers = createListLayoutHelpers({
    getListEl: () => rightShellRefs.listEl,
    getListBodyEl: () => rightShellRefs.listBodyEl,
    getListCols: () => state.rightPane.listCols,
    getListRows: () => state.rightPane.listRows,
    getVisibleColStart: () => state.rightPane.visibleColStart,
    getVisibleColEnd: () => state.rightPane.visibleColEnd,
    getFilteredCount: () => (state.rightPane.filteredEntries.length || state.rightPane.entries.length),
    getShowSize: () => state.showSize,
    getShowTime: () => state.showTime,
    setListRows: (v) => { state.rightPane.listRows = v; },
    setListCols: (v) => { state.rightPane.listCols = v; },
    setNameMaxChars: (v) => { state.rightPane.nameMaxChars = v; },
    setVisibleColStart: (v) => { state.rightPane.visibleColStart = v; },
    setVisibleColEnd: (v) => { state.rightPane.visibleColEnd = v; },
    setOverflowLeft: (v) => { state.rightPane.overflowLeft = v; },
    setOverflowRight: (v) => { state.rightPane.overflowRight = v; },
  });

  // Helper: check if the right pane has DOM focus
  function isDualRightFocused() {
    if (state.layoutMode !== "dual") return false;
    return isPaneFocused(rightShellRefs);
  }

  // Helper: check if the left pane has DOM focus
  function isDualLeftFocused() {
    if (state.layoutMode !== "dual") return false;
    return isPaneFocused(shellRefs);
  }

  // Tracks which pane owns the currently-open dropdown.
  // Set at the moment the dropdown opens, while DOM focus is still on the pane element.
  let dropdownOwnerPaneId = $state("left");

  // Routing decision: should this action go to the right pane?
  // - DOM focus in right pane → right
  // - DOM focus in left pane → left
  // - Dropdown open → use dropdownOwnerPaneId (recorded at open time, before focus moves to overlay)
  // - DOM focus outside both panes (other overlay) → use activePaneId fallback
  function shouldRouteToRightPane() {
    if (state.layoutMode !== "dual") return false;
    if (isDualRightFocused()) return true;
    if (isDualLeftFocused()) return false;
    if (state.dropdownOpen) return dropdownOwnerPaneId === "right";
    return state.activePaneId === "right";
  }

  // ── Git status refresh helpers ────────────────────────────────────────────
  // Logic lives in page_git_panel_logic.ts — destructured above as gitPanelHandlers.

  // Wrap actions.loadDir with dual-pane routing + git refresh
  const _leftLoadDir = actions.loadDir;
  actions.loadDir = async (path) => {
    if (shouldRouteToRightPane()) {
      await rightDirHelpers.loadDir(path);
      void refreshRightGitStatus(path);
      return;
    }
    await _leftLoadDir(path);
    void refreshLeftGitStatus(path);
  };

  // Wrap actions.focusList with dual-pane routing
  const _baseFocusList = actions.focusList;
  actions.focusList = () => {
    if (shouldRouteToRightPane()) {
      rightShellRefs.listEl?.focus({ preventScroll: true });
    } else {
      _baseFocusList();
    }
  };

  // Right-pane focus movers (cursor key navigation)
  const rightFocusMovers = createListFocusMovers({
    getEntries: () => state.rightPane.entries,
    getFilteredEntries: () => state.rightPane.filteredEntries.length ? state.rightPane.filteredEntries : state.rightPane.entries,
    getFocusedIndex: () => state.rightPane.focusedIndex,
    getAnchorIndex: () => state.rightPane.anchorIndex ?? null,
    getListRows: () => state.rightPane.listRows,
    setFocusedIndex: (v) => { state.rightPane.focusedIndex = v; },
    selectRange: (from, to) => {
      const result = selectRangeByIndex(state.rightPane.entries, from, to);
      state.rightPane.selectedPaths = result.selectedPaths;
      state.rightPane.focusedIndex = result.focusedIndex;
      state.rightPane.anchorIndex = result.anchorIndex;
    },
    ensureColumnVisible: rightListLayoutHelpers.ensureColumnVisible,
  });

  // Wrap focus movers so the right pane's movers are used when it has DOM focus.
  const moveByRowFallback = actions.moveFocusByRow;
  actions.moveFocusByRow = (delta, useRange) => {
    if (isDualRightFocused()) {
      return rightFocusMovers.moveFocusByRow(delta, useRange);
    }
    return moveByRowFallback(delta, useRange);
  };

  const moveByColFallback = actions.moveFocusByColumn;
  actions.moveFocusByColumn = (delta, useRange) => {
    if (isDualRightFocused()) {
      return rightFocusMovers.moveFocusByColumn(delta, useRange);
    }
    return moveByColFallback(delta, useRange);
  };

  $effect(() => actions.recomputeSearch());
  $effect(() => actions.recomputeDropdownItems());
  $effect(() => actions.recomputeStatusItems());
  $effect(() => actions.clampDropdownSelection());

  // Fetch provider capabilities (copy/move/delete support) for the left pane's current
  // directory. Runs async and cancels on path change to avoid stale writes.
  $effect(() => {
    const path = String(state.currentPath || "").trim();
    let cancelled = false;

    if (import.meta.env.DEV && testCapabilityOverride) {
      state.currentPathCapabilities = normalizeProviderCapabilities(testCapabilityOverride);
      return;
    }

    if (!path) {
      state.currentPathCapabilities = normalizeProviderCapabilities(null);
      return;
    }

    (async () => {
      try {
        const capabilities = await fsGetCapabilities(path);
        if (cancelled) return;
        if (state.currentPath === path) {
          state.currentPathCapabilities = normalizeProviderCapabilities(capabilities);
        }
      } catch {
        if (cancelled) return;
        if (state.currentPath === path) {
          state.currentPathCapabilities = normalizeProviderCapabilities(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  });

  const {
    listEffectConfig,
    dropdownEffectConfig,
    themeEffectConfig,
    modalFocusConfig,
    modalInputFocusConfig,
    modalTrapConfig,
  } = $derived(
    createPageEffectsRuntime(
      buildPageEffectsRuntimeInputsFromState({
        state,
        shellRefs,
        overlayRefs,
        actions,
        deps: {
          tick,
          invoke,
          showError,
        },
      })
    )
  );

  $effect(() => applyListLayoutEffects(listEffectConfig));
  $effect(() => applyDropdownEffects(dropdownEffectConfig));
  // Record which pane owns the dropdown at the moment it opens.
  // applyDropdownEffects calls focusDropdownOnOpen which does `await tick()` before
  // moving DOM focus to the overlay — so at this point the pane element still has focus.
  $effect(() => {
    if (!state.dropdownOpen) return;
    dropdownOwnerPaneId = isDualRightFocused() ? "right" : "left";
  });
  $effect(() =>
    applyThemeEffect(
      themeEffectConfig.uiConfigLoaded,
      themeEffectConfig.uiTheme,
      themeEffectConfig.invoke,
      themeEffectConfig.showError
    )
  );

  $effect(() => applyModalFocuses(focusModalOnOpen, modalFocusConfig));
  $effect(() => applyModalInputFocuses(focusModalInputOnOpen, modalInputFocusConfig));
  $effect(() => applyModalTraps(trapModalFocus, modalTrapConfig));

  $effect(() =>
    focusPropertiesOnOpen(
      state.propertiesOpen,
      tick,
      overlayRefs.propertiesModalEl,
      overlayRefs.propertiesCloseButton
    )
  );

  $effect(() => setupContextMenuKeydown(state.contextMenuOpen, actions.handleContextMenuKey));

  // ── Clipboard preview ────────────────────────────────────────────────────
  // Detect copy/cut: watch lastClipboard for changes.
  // Uses $effect instead of wrapping pageActions because the keyboard dispatch
  // chain reads from pageActionGroups.selection (a snapshot), not pageActions.
  let clipboardEffectSkipInitial = true;
  $effect(() => {
    const clip = state.lastClipboard; // establish reactive dependency
    if (clipboardEffectSkipInitial) {
      clipboardEffectSkipInitial = false;
      return; // skip the value already stored from before this effect ran
    }
    if (clip.paths.length > 0) {
      captureClipboardMeta(state);
    }
  });

  // Dismiss preview when paste is initiated.
  patchPasteItemsForPreview(pageActionGroups, () => { state.clipboardPreviewVisible = false; });

  // ESC dismisses the clipboard preview (if no other modal is open)
  $effect(() => {
    const handler = makeClipboardEscHandler(state, () => settingsOpen);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  // ─────────────────────────────────────────────────────────────────────────

  // Wraps every method of `source` so that `state.activePaneId` is set to `paneId`
  // before each call. Using a plain object (not Proxy) to avoid Svelte 5 internals.
  function createPaneActions(source, paneId) {
    const result = {};
    for (const key of Object.keys(source)) {
      const value = source[key];
      result[key] = typeof value === "function"
        ? (...args) => { state.activePaneId = paneId; return value(...args); }
        : value;
    }
    return result;
  }

  // Wraps a single function so `state.activePaneId` is set before it runs.
  function wrapWithPane(fn, paneId) {
    return (...args) => { state.activePaneId = paneId; return fn(...args); };
  }

  const leftPageActions = createPaneActions(pageActions, "left");

  const viewRuntime = createPageViewRuntimeBundle(
    buildPageViewRuntimeBundleInputsFromState({
      state: () => state,
      shellRefs: () => shellRefs,
      overlayRefs: () => overlayRefs,
      pageActions: leftPageActions,
      pageActionGroups,
      actions,
      deps: { getVisibleTreeNodes, trapModalTab, openUrl, autofocus },
      dirStats: { clearDirStatsCache },
      meta: {
        formatName: formatNameForList,
        formatSize,
        formatModified,
        MENU_GROUPS,
        ABOUT_URL,
        ABOUT_LICENSE,
        ZIP_PASSWORD_MAX_ATTEMPTS,
        t,
      },
    })
  );
  const overlayBindings = viewRuntime.overlayBindings;

  // Inject resolveGitBadge into left-pane fileListProps
  const viewProps = $derived.by(() => {
    const base = viewRuntime.getViewProps();
    const gs = state.gitStatus;
    return {
      ...base,
      fileListProps: {
        ...base.fileListProps,
        resolveGitBadge: gs?.is_repo
          ? (entry) => getEntryGitBadge(entry.path, gs.repo_root, gs.statuses, entry.entry_type === "dir")
          : null,
      },
    };
  });

  // Right pane list layout effect
  $effect(() => applyListLayoutEffects({
    listBodyEl: rightShellRefs.listBodyEl,
    listEl: rightShellRefs.listEl,
    updateListRows: rightListLayoutHelpers.updateListRows,
    updateOverflowMarkers: rightListLayoutHelpers.updateOverflowMarkers,
    updateVisibleColumns: rightListLayoutHelpers.updateVisibleColumns,
    getActualColumnSpan: rightListLayoutHelpers.getActualColumnSpan,
  }));

  const rightPageActions = createPaneActions(pageActions, "right");

  // Right pane full view runtime (same functionality as left pane)
  const rightPaneViewProps = $derived.by(() => {
    const base = createViewRuntime(
      buildViewRuntimeInputsFromState({
        state: {
          // Pane-specific fields from rightPane
          currentPath: state.rightPane.currentPath,
          loading: state.rightPane.loading,
          filteredEntries: state.rightPane.filteredEntries,
          entries: state.rightPane.entries,
          pathCompletionPreviewActive: state.rightPane.pathCompletionPreviewActive,
          overflowLeft: state.rightPane.overflowLeft,
          overflowRight: state.rightPane.overflowRight,
          visibleColStart: state.rightPane.visibleColStart,
          visibleColEnd: state.rightPane.visibleColEnd,
          listRows: state.rightPane.listRows,
          selectedPaths: state.rightPane.selectedPaths,
          dropdownItems: state.dropdownItems,
          searchActive: state.rightPane.searchActive,
          searchError: state.rightPane.searchError,
          error: state.rightPane.error,
          // Global fields (shared UI state)
          menuOpen: state.menuOpen,
          pathHistory: state.pathHistory,
          showTree: false,
          treeLoading: state.treeLoading,
          treeRoot: state.treeRoot,
          treeSelectedPath: state.treeSelectedPath,
          treeFocusedIndex: state.treeFocusedIndex,
          showSize: state.showSize,
          showTime: state.showTime,
          ui_file_icon_mode: state.ui_file_icon_mode,
          sortMenuOpen: state.sortMenuOpen,
          aboutOpen: state.aboutOpen,
          deleteConfirmOpen: state.deleteConfirmOpen,
          deleteTargets: state.deleteTargets,
          deleteError: state.deleteError,
          pasteConfirmOpen: state.pasteConfirmOpen,
          pasteConflicts: state.pasteConflicts,
          createOpen: state.createOpen,
          createError: state.createError,
          jumpUrlOpen: state.jumpUrlOpen,
          renameOpen: state.renameOpen,
          renameError: state.renameError,
          propertiesOpen: state.propertiesOpen,
          propertiesData: state.propertiesData,
          dirStatsInFlight: state.dirStatsInFlight,
          zipModalOpen: state.zipModalOpen,
          zipMode: state.zipMode,
          zipTargets: state.zipTargets,
          zipPasswordAttempts: state.zipPasswordAttempts,
          zipOverwriteConfirmed: state.zipOverwriteConfirmed,
          zipError: state.zipError,
          contextMenuOpen: state.contextMenuOpen,
          contextMenuPos: state.contextMenuPos,
          contextMenuIndex: state.contextMenuIndex,
          failureModalOpen: state.failureModalOpen,
          failureModalTitle: state.failureModalTitle,
          failureItems: state.failureItems,
          jumpList: state.jumpList,
        },
        treeEl: null,
        pageActions: rightPageActions,
        pageActionGroups,
        menu: {
          toggleMenu: actions.toggleMenu,
          getMenuItems: actions.getMenuItems,
          closeMenu: actions.closeMenu,
        },
        list: {
          loadDir: wrapWithPane(actions.loadDir, "right"),
          focusList: () => rightShellRefs.listEl?.focus({ preventScroll: true }),
          handlePathTabCompletion: wrapWithPane(actions.handlePathTabCompletion, "right"),
          handlePathCompletionSeparator: wrapWithPane(actions.handlePathCompletionSeparator, "right"),
          handlePathCompletionInputChange: wrapWithPane(actions.handlePathCompletionInputChange, "right"),
          clearPathCompletionPreview: wrapWithPane(actions.clearPathCompletionPreview, "right"),
        },
        tree: {
          focusTree: () => {},
          focusTreeTop: () => {},
          selectTreeNode: () => {},
          toggleTreeNode: () => {},
        },
        keymap: { matchesAction: actions.matchesAction },
        sort: {
          setSort: wrapWithPane(actions.setSort, "right"),
          handleSortMenuKey: wrapWithPane(actions.handleSortMenuKey, "right"),
        },
        deps: { getVisibleTreeNodes, trapModalTab, openUrl, autofocus },
        dirStats: { clearDirStatsCache },
        meta: {
          formatName: formatNameForList,
          formatSize,
          formatModified,
          MENU_GROUPS,
          ABOUT_URL,
          ABOUT_LICENSE,
          ZIP_PASSWORD_MAX_ATTEMPTS,
          t,
        },
        overlay: viewRuntime.getOverlayState(),
      })
    ).viewProps;
    // Inject resolveGitBadge for right pane
    const gs = state.rightPane.gitStatus;
    return {
      ...base,
      fileListProps: {
        ...base.fileListProps,
        resolveGitBadge: gs?.is_repo
          ? (entry) => getEntryGitBadge(entry.path, gs.repo_root, gs.statuses, entry.entry_type === "dir")
          : null,
      },
    };
  });

  // Keep right pane filteredEntries in sync with entries (no search for right pane yet)
  $effect(() => {
    state.rightPane.filteredEntries = state.rightPane.entries;
  });

  // Auto-refresh git status when the left pane's current path changes
  $effect(() => {
    const path = state.currentPath;
    if (!path) { state.gitStatus = null; return; }
    void refreshLeftGitStatus(path);
  });

  // Auto-refresh git status when the right pane's current path changes
  $effect(() => {
    const path = state.rightPane.currentPath;
    if (!path) { state.rightPane.gitStatus = null; return; }
    void refreshRightGitStatus(path);
  });

  // Fetch provider capabilities for the right pane's current directory.
  // Lazy-imports tauri_fs to avoid loading it before the right pane is ever opened.
  $effect(() => {
    const path = String(state.rightPane.currentPath || "").trim();
    if (!path) {
      state.rightPane.currentPathCapabilities = normalizeProviderCapabilities(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { fsGetCapabilities } = await import("$lib/utils/tauri_fs");
        const capabilities = await fsGetCapabilities(path);
        if (cancelled) return;
        if (state.rightPane.currentPath === path) {
          state.rightPane.currentPathCapabilities = normalizeProviderCapabilities(capabilities);
        }
      } catch {
        // ignore capability errors for right pane
      }
    })();
    return () => { cancelled = true; };
  });

  // Force single-column layout in dual mode for left pane
  $effect(() => {
    if (state.layoutMode === "dual") {
      state.listCols = 1;
      state.rightPane.listCols = 1;
    }
  });

  // Ctrl+G to toggle git panel
  $effect(() => {
    const handler = gitPanelHandlers.makeGitPanelToggleHandler();
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  });

  // ── Git panel CSS offset ──────────────────────────────────────────────────
  // When the panel is open, push the main content left by the panel width via a
  // CSS custom property so the panel never overlaps either pane.
  $effect(() => {
    document.documentElement.style.setProperty(
      "--git-panel-offset",
      state.gitPanelOpen ? GIT_PANEL_WIDTH : "0px"
    );
  });

  // F3 key to toggle dual/single pane mode — logic lives in page_dual_pane_handlers.ts
  $effect(() => {
    const handler = createDualPaneToggleHandler({
      getLayoutMode:       () => state.layoutMode,
      setLayoutMode:       (v) => { state.layoutMode = v; },
      setActivePaneId:     (v) => { state.activePaneId = v; },
      getRightCurrentPath: () => state.rightPane.currentPath,
      getLeftCurrentPath:  () => state.currentPath,
      loadRightDir:        (path) => { rightDirHelpers.loadDir(path); },
    });
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  });

  // Ctrl+W: cross-pane WinMerge comparison (dual mode only) — logic in page_dual_pane_handlers.ts
  $effect(() => {
    const handler = createWinMergeCrossPaneHandler({
      getLayoutMode:         () => state.layoutMode,
      getLeftSelectedPaths:  () => state.selectedPaths,
      getRightSelectedPaths: () => state.rightPane.selectedPaths,
      compareFiles:          (l, r) => winmergeCompareFiles(l, r),
      showError:             (err) => actions.showError(err),
    });
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  });

  // Active pane's entries — used by ClipboardPreview to detect paste conflicts
  const clipboardPreviewEntries = $derived(
    state.layoutMode === "dual" && state.activePaneId === "right"
      ? state.rightPane.filteredEntries
      : state.filteredEntries
  );

  const pageShellProps = $derived({
    showTree: state.showTree,
    statusItems: state.statusItems,
    viewProps,
    overlayBindings,
    layoutMode: state.layoutMode,
    activePaneId: state.activePaneId,
    rightPaneViewProps: state.layoutMode === "dual" ? rightPaneViewProps : null,
    onActivateLeft: () => {
      state.activePaneId = "left";
      const activeEl = document.activeElement;
      if (!(activeEl instanceof HTMLInputElement) && !(activeEl instanceof HTMLTextAreaElement)) {
        shellRefs.listEl?.focus({ preventScroll: true });
      }
    },
    onActivateRight: () => {
      state.activePaneId = "right";
      const activeEl = document.activeElement;
      if (!(activeEl instanceof HTMLInputElement) && !(activeEl instanceof HTMLTextAreaElement)) {
        rightShellRefs.listEl?.focus({ preventScroll: true });
      }
    },
  });

  // ── Settings modal actions ────────────────────────────────────────────────
  // Logic lives in page_settings_logic.ts (pure) and page_settings_actions.ts (side effects).

  async function openSettingsModal(options = undefined) {
    return settingsActions.openSettingsModal(options);
  }
  function closeSettingsModal() {
    return settingsActions.closeSettingsModal();
  }
  async function saveSettings(values) {
    return settingsActions.saveSettings(values);
  }
  async function openConfigFromSettings() {
    return settingsActions.openConfigFromSettings();
  }
  async function createSettingsBackup() {
    return settingsActions.createSettingsBackup();
  }
  async function restoreSettingsBackup() {
    return settingsActions.restoreSettingsBackup();
  }
  async function exportDiagnosticReport(options) {
    return settingsActions.exportDiagnosticReport(options);
  }
  async function runSettingsDiagnostic(kind, values) {
    return settingsActions.runSettingsDiagnostic(kind, values);
  }

  onMount(() => {
    let disposed = false;

    (async () => {
      try {
        const session = await invoke("undo_redo_load_session", { limit: UNDO_LIMIT });
        if (disposed) return;

        const undoStack = normalizeUndoEntries(session?.undo_stack ?? session?.undoStack ?? []);
        const redoStack = normalizeUndoEntries(session?.redo_stack ?? session?.redoStack ?? []);
        state.undoStack = undoStack;
        state.redoStack = redoStack;
      } catch {
        // ignore undo/redo session load errors
      } finally {
        if (!disposed) {
          undoSessionLoaded = true;
        }
      }
    })();

    return () => {
      disposed = true;
      if (undoSessionSaveTimer) {
        clearTimeout(undoSessionSaveTimer);
        undoSessionSaveTimer = null;
      }
    };
  });

  $effect(() => {
    const undoStack = state.undoStack;
    const redoStack = state.redoStack;
    if (!undoSessionLoaded) return;

    if (undoSessionSaveTimer) {
      clearTimeout(undoSessionSaveTimer);
      undoSessionSaveTimer = null;
    }

    undoSessionSaveTimer = setTimeout(() => {
      void invoke("undo_redo_save_session", {
        undoStack,
        redoStack,
        limit: UNDO_LIMIT,
      }).catch(() => {});
    }, UNDO_SAVE_DEBOUNCE_MS);

    return () => {
      if (undoSessionSaveTimer) {
        clearTimeout(undoSessionSaveTimer);
        undoSessionSaveTimer = null;
      }
    };
  });
  onMount(() => {
    const handler = (event) => {
      const requestedSection = normalizeSettingsSection(event?.detail?.section);
      if (settingsOpen) {
        settingsInitialSection = requestedSection;
        return;
      }
      void openSettingsModal({ initialSection: requestedSection });
    };
    window.addEventListener("rf:open-settings", handler);
    return () => {
      window.removeEventListener("rf:open-settings", handler);
    };
  });

  $effect(() => {
    if (typeof window !== "undefined") {
      window.__rf_settings_open = settingsOpen;
    }
  });

  $effect(() => {
    if (typeof window === "undefined" || !import.meta.env.DEV) {
      return;
    }

    const parseBindingToKeyboardEvent = (binding) => {
      const tokens = String(binding || "")
        .split("+")
        .map((part) => part.trim())
        .filter(Boolean);
      if (!tokens.length) return null;

      const mods = {
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
      };
      const keyTokens = [];
      for (const token of tokens) {
        const normalized = token.toLowerCase();
        if (normalized === "ctrl" || normalized === "control") {
          mods.ctrlKey = true;
        } else if (normalized === "shift") {
          mods.shiftKey = true;
        } else if (normalized === "alt") {
          mods.altKey = true;
        } else if (
          normalized === "meta" ||
          normalized === "cmd" ||
          normalized === "command" ||
          normalized === "win" ||
          normalized === "super"
        ) {
          mods.metaKey = true;
        } else {
          keyTokens.push(token);
        }
      }
      if (!keyTokens.length) return null;
      const rawKey = keyTokens[keyTokens.length - 1];
      const lower = rawKey.toLowerCase();
      const named = {
        enter: { key: "Enter", code: "Enter" },
        tab: { key: "Tab", code: "Tab" },
        escape: { key: "Escape", code: "Escape" },
        esc: { key: "Escape", code: "Escape" },
        space: { key: " ", code: "Space" },
        delete: { key: "Delete", code: "Delete" },
        backspace: { key: "Backspace", code: "Backspace" },
        up: { key: "ArrowUp", code: "ArrowUp" },
        down: { key: "ArrowDown", code: "ArrowDown" },
        left: { key: "ArrowLeft", code: "ArrowLeft" },
        right: { key: "ArrowRight", code: "ArrowRight" },
      };
      const namedHit = named[lower];
      if (namedHit) {
        return { ...mods, key: namedHit.key, code: namedHit.code };
      }
      if (/^f\d{1,2}$/i.test(rawKey)) {
        const upper = rawKey.toUpperCase();
        return { ...mods, key: upper, code: upper };
      }
      if (/^[a-z]$/i.test(rawKey)) {
        const upper = rawKey.toUpperCase();
        return { ...mods, key: rawKey.toLowerCase(), code: `Key${upper}` };
      }
      if (/^[0-9]$/.test(rawKey)) {
        return { ...mods, key: rawKey, code: `Digit${rawKey}` };
      }
      return { ...mods, key: rawKey, code: rawKey };
    };

    const triggerBinding = (binding) => {
      const init = parseBindingToKeyboardEvent(binding);
      if (!init) return false;
      const target = document.activeElement || document.body || window;
      target.dispatchEvent(new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true }));
      window.dispatchEvent(new KeyboardEvent("keydown", { ...init, bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent("keyup", { ...init, bubbles: true, cancelable: true }));
      window.dispatchEvent(new KeyboardEvent("keyup", { ...init, bubbles: true, cancelable: true }));
      return true;
    };

    const hooks = {
      setCurrentPathCapabilities: (value) => {
        testCapabilityOverride = value ? normalizeProviderCapabilities(value) : null;
        state.currentPathCapabilities = normalizeProviderCapabilities(testCapabilityOverride);
      },
      setCurrentPathForTest: (value) => {
        const nextPath = String(value || "");
        state.currentPath = nextPath;
        state.pathInput = nextPath;
      },
      getCurrentPathCapabilities: () => ({ ...state.currentPathCapabilities }),
      getStatusMessage: () => String(state.statusMessage || ""),
      clearStatusMessage: () => {
        state.statusMessage = "";
      },
      canCreateCurrentPath: () =>
        typeof actions.canCreateCurrentPath === "function"
          ? Boolean(actions.canCreateCurrentPath())
          : false,
      canPasteCurrentPath: () =>
        typeof actions.canPasteCurrentPath === "function"
          ? Boolean(actions.canPasteCurrentPath())
          : false,
      getActionBinding: (actionId) => {
        const bindings = keymapBindings.getActionBindings(String(actionId || ""));
        return Array.isArray(bindings) && bindings.length > 0 ? String(bindings[0] || "") : "";
      },
      triggerActionShortcut: (actionId) => {
        const binding = hooks.getActionBinding(actionId);
        if (!binding) return false;
        return triggerBinding(binding);
      },
    };

    window.__rf_test_hooks = hooks;
    return () => {
      if (window.__rf_test_hooks === hooks) {
        delete window.__rf_test_hooks;
      }
    };
  });
</script>

<PageShellBindings
  bind:state={state}
  bind:refs={shellRefs}
  bind:rightRefs={rightShellRefs}
  {...pageShellProps}
/>

{#if state.clipboardPreviewVisible && state.clipboardItemsMeta.length > 0}
  <ClipboardPreview
    lastClipboard={state.lastClipboard}
    clipboardItemsMeta={state.clipboardItemsMeta}
    currentEntries={clipboardPreviewEntries}
    onClose={() => { state.clipboardPreviewVisible = false; }}
  />
{/if}

{#if state.gitPanelOpen}
  <GitPanel
    gitStatus={state.activePaneId === "right" ? state.rightPane.gitStatus : state.gitStatus}
    currentPath={state.activePaneId === "right" ? state.rightPane.currentPath : state.currentPath}
    onClose={closeGitPanel}
    onRefresh={() => {
      if (state.activePaneId === "right") {
        void refreshRightGitStatus();
        void rightDirHelpers.loadDir(state.rightPane.currentPath);
      } else {
        void refreshLeftGitStatus();
        void _leftLoadDir(state.currentPath);
      }
    }}
    onOpenPath={(path, side) => {
      if (side === "right") {
        void rightDirHelpers.loadDir(path);
      } else {
        void _leftLoadDir(path);
      }
    }}
  />
{/if}

{#if settingsOpen}
  <SettingsModal
    bind:modalEl={settingsModalEl}
    t={t}
    initial={settingsInitial}
    profiles={settingsProfiles}
    saving={settingsSaving}
    testing={settingsTesting}
    testMessage={settingsTestMessage}
    testIsError={settingsTestIsError}
    reporting={settingsReporting}
    reportMessage={settingsReportMessage}
    reportIsError={settingsReportIsError}
    shortcutConflicts={settingsShortcutConflicts}
    error={settingsError}
    initialSection={settingsInitialSection}
    onCancel={closeSettingsModal}
    onSave={saveSettings}
    onOpenConfig={openConfigFromSettings}
    onBackupConfig={createSettingsBackup}
    onRestoreConfig={restoreSettingsBackup}
    onExportReport={exportDiagnosticReport}
    onRunDiagnostic={runSettingsDiagnostic}
    {trapModalTab}
    {autofocus}
  />
{/if}


