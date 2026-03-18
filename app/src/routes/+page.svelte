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
    UNDO_LIMIT,
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
  import { autofocus, createListNameFormatter, createTranslator } from "$lib/page_helpers";
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
  import { isRightPaneFocused } from "$lib/pane_focus_utils";

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

  function normalizeProviderCapabilities(value) {
    return {
      can_read: Boolean(value?.can_read ?? true),
      can_create: Boolean(value?.can_create ?? true),
      can_rename: Boolean(value?.can_rename ?? true),
      can_copy: Boolean(value?.can_copy ?? true),
      can_move: Boolean(value?.can_move ?? true),
      can_delete: Boolean(value?.can_delete ?? true),
      can_archive_create: Boolean(value?.can_archive_create ?? true),
      can_archive_extract: Boolean(value?.can_archive_extract ?? true),
    };
  }

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

  // Register Tab handler BEFORE lifecycle keydown handler so stopImmediatePropagation works
  onMount(() => {
    function handleDualModeTab(event) {
      if (state.layoutMode !== "dual") return;

      // Sync activePaneId with actual DOM focus for ALL key events
      // This ensures Enter, Backspace, etc. all operate on the correct pane
      const activeEl = document.activeElement;
      if (activeEl) {
        const inRight =
          (rightShellRefs.listEl && (activeEl === rightShellRefs.listEl || rightShellRefs.listEl.contains(activeEl))) ||
          (rightShellRefs.pathInputEl && activeEl === rightShellRefs.pathInputEl);
        const inLeft =
          (shellRefs.listEl && (activeEl === shellRefs.listEl || shellRefs.listEl.contains(activeEl))) ||
          (shellRefs.pathInputEl && activeEl === shellRefs.pathInputEl);
        if (inRight) state.activePaneId = "right";
        else if (inLeft) state.activePaneId = "left";
      }

      if (event.key !== "Tab" || event.altKey || event.metaKey) return;
      const isInModal = typeof activeEl?.closest === "function" && activeEl.closest(".modal, .modal-backdrop, .dropdown, .sort-menu");
      if (isInModal) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.ctrlKey) {
        const newPaneId = state.activePaneId === "left" ? "right" : "left";
        state.activePaneId = newPaneId;
        if (newPaneId === "right") {
          rightShellRefs.listEl?.focus({ preventScroll: true });
        } else {
          shellRefs.listEl?.focus({ preventScroll: true });
        }
        return;
      }

      const leftListEl = shellRefs.listEl;
      const leftPathEl = shellRefs.pathInputEl;
      const rightListEl = rightShellRefs.listEl;
      const rightPathEl = rightShellRefs.pathInputEl;

      const inLeft =
        (leftListEl && (activeEl === leftListEl || leftListEl.contains?.(activeEl))) ||
        (leftPathEl && (activeEl === leftPathEl || leftPathEl.contains?.(activeEl)));
      const inRight =
        (rightListEl && (activeEl === rightListEl || rightListEl.contains?.(activeEl))) ||
        (rightPathEl && (activeEl === rightPathEl || rightPathEl.contains?.(activeEl)));

      if (inLeft) state.activePaneId = "left";
      else if (inRight) state.activePaneId = "right";

      const paneId = inRight ? "right" : "left";
      const listEl = paneId === "right" ? rightListEl : leftListEl;
      const pathEl = paneId === "right" ? rightPathEl : leftPathEl;

      const isListFocused = listEl && (activeEl === listEl || listEl.contains?.(activeEl));
      const isPathFocused = pathEl && (activeEl === pathEl || pathEl.contains?.(activeEl));

      if (!event.shiftKey) {
        if (isListFocused) {
          pathEl?.focus({ preventScroll: true });
          /** @type {any} */ (pathEl)?.select?.();
        } else {
          listEl?.focus({ preventScroll: true });
        }
      } else {
        if (isPathFocused) {
          listEl?.focus({ preventScroll: true });
        } else {
          pathEl?.focus({ preventScroll: true });
          /** @type {any} */ (pathEl)?.select?.();
        }
      }
    }
    // Sync activePaneId on pointer events so mouse-based selection uses the correct pane.
    // pointerdown fires before click/focus, ensuring activePaneId is set before selection actions run.
    function handleDualModePointerDown(event) {
      if (state.layoutMode !== "dual") return;
      const target = /** @type {Node | null} */ (event.target);
      if (!target) return;
      if (
        (rightShellRefs.listEl && rightShellRefs.listEl.contains(target)) ||
        (rightShellRefs.pathInputEl && rightShellRefs.pathInputEl.contains(target))
      ) {
        state.activePaneId = "right";
      } else if (
        (shellRefs.listEl && shellRefs.listEl.contains(target)) ||
        (shellRefs.pathInputEl && shellRefs.pathInputEl.contains(target))
      ) {
        state.activePaneId = "left";
      }
    }
    window.addEventListener("keydown", handleDualModeTab, { capture: true });
    window.addEventListener("pointerdown", handleDualModePointerDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleDualModeTab, { capture: true });
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
    return isRightPaneFocused(rightShellRefs);
  }

  // Helper: check if the left pane has DOM focus
  function isDualLeftFocused() {
    if (state.layoutMode !== "dual") return false;
    return isRightPaneFocused(shellRefs);
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
  async function refreshLeftGitStatus(path) {
    try {
      state.gitStatus = await gitGetStatus(path || state.currentPath);
    } catch {
      state.gitStatus = null;
    }
  }
  async function refreshRightGitStatus(path) {
    try {
      state.rightPane.gitStatus = await gitGetStatus(path || state.rightPane.currentPath);
    } catch {
      state.rightPane.gitStatus = null;
    }
  }

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

  const _baseMoveByRow = actions.moveFocusByRow;
  actions.moveFocusByRow = (delta, useRange) => {
    if (isDualRightFocused()) {
      return rightFocusMovers.moveFocusByRow(delta, useRange);
    }
    return _baseMoveByRow(delta, useRange);
  };

  const _baseMoveByCol = actions.moveFocusByColumn;
  actions.moveFocusByColumn = (delta, useRange) => {
    if (isDualRightFocused()) {
      return rightFocusMovers.moveFocusByColumn(delta, useRange);
    }
    return _baseMoveByCol(delta, useRange);
  };

  $effect(() => actions.recomputeSearch());
  $effect(() => actions.recomputeDropdownItems());
  $effect(() => actions.recomputeStatusItems());
  $effect(() => actions.clampDropdownSelection());
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
  // Captures per-item metadata (name, modified, isDir) at copy/cut time so the
  // preview can show timestamps even after the user navigates away.
  function captureClipboardMeta() {
    const paths = state.lastClipboard.paths;
    const srcEntries =
      state.layoutMode === "dual" && state.activePaneId === "right"
        ? state.rightPane.entries
        : state.entries;
    state.clipboardItemsMeta = paths.map((p) => {
      const name = p.split(/[\\\/]/).pop() || p;
      const entry = srcEntries.find((e) => e.path === p);
      return { path: p, name, modified: entry?.modified ?? null, isDir: entry?.is_dir ?? false };
    });
    state.clipboardPreviewVisible = true;
  }

  // Detect copy/cut: watch lastClipboard for changes.
  // Uses $effect instead of wrapping pageActions because the keyboard dispatch
  // chain reads from pageActionGroups.selection (a snapshot), not pageActions.
  let _clipboardEffectInitialized = false;
  $effect(() => {
    const clip = state.lastClipboard; // establish reactive dependency
    if (!_clipboardEffectInitialized) {
      _clipboardEffectInitialized = true;
      return; // skip initial stored value
    }
    if (clip.paths.length > 0) {
      captureClipboardMeta();
    }
  });

  // Dismiss preview when paste is initiated.
  // pageActionGroups.selection is a plain object — patching it is read each call
  // because pageMountHandlers() rebuilds handlers lazily on every dispatch.
  const _origPasteInGroup = pageActionGroups.selection.pasteItems;
  pageActionGroups.selection.pasteItems = async (...args) => {
    state.clipboardPreviewVisible = false;
    return _origPasteInGroup(...args);
  };

  // ESC dismisses the clipboard preview (if no other modal is open)
  $effect(() => {
    function handleEscPreview(e) {
      if (
        e.key === "Escape" &&
        state.clipboardPreviewVisible &&
        !state.deleteConfirmOpen &&
        !state.pasteConfirmOpen &&
        !state.createOpen &&
        !state.renameOpen &&
        !state.propertiesOpen &&
        !state.zipModalOpen &&
        !state.aboutOpen &&
        !state.jumpUrlOpen &&
        !settingsOpen
      ) {
        state.clipboardPreviewVisible = false;
        e.stopPropagation();
      }
    }
    window.addEventListener("keydown", handleEscPreview);
    return () => window.removeEventListener("keydown", handleEscPreview);
  });
  // ─────────────────────────────────────────────────────────────────────────

  // Left pane: wrap only the selection-writing actions to ensure activePaneId="left".
  // Using a spread object (not Proxy) to avoid interfering with Svelte 5 internals.
  const leftPageActions = {
    ...pageActions,
    toggleSelection: (...args) => { state.activePaneId = "left"; return pageActions.toggleSelection(...args); },
    selectRange: (...args) => { state.activePaneId = "left"; return pageActions.selectRange(...args); },
    setSelected: (...args) => { state.activePaneId = "left"; return pageActions.setSelected(...args); },
    clearSelection: (...args) => { state.activePaneId = "left"; return pageActions.clearSelection(...args); },
    invertSelection: (...args) => { state.activePaneId = "left"; return pageActions.invertSelection(...args); },
    openContextMenu: (...args) => { state.activePaneId = "left"; return pageActions.openContextMenu(...args); },
  };

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

  // Right pane: proxy wraps pageActions to ensure activePaneId="right" before each call
  const rightPageActions = new Proxy(pageActions, {
    get(target, prop) {
      const value = target[prop];
      if (typeof value === "function") {
        return (...args) => {
          state.activePaneId = "right";
          return value(...args);
        };
      }
      return value;
    },
  });

  function activateRight(fn) {
    return (...args) => {
      state.activePaneId = "right";
      return fn(...args);
    };
  }

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
          loadDir: activateRight(actions.loadDir),
          focusList: () => rightShellRefs.listEl?.focus({ preventScroll: true }),
          handlePathTabCompletion: activateRight(actions.handlePathTabCompletion),
          handlePathCompletionSeparator: activateRight(actions.handlePathCompletionSeparator),
          handlePathCompletionInputChange: activateRight(actions.handlePathCompletionInputChange),
          clearPathCompletionPreview: activateRight(actions.clearPathCompletionPreview),
        },
        tree: {
          focusTree: () => {},
          focusTreeTop: () => {},
          selectTreeNode: () => {},
          toggleTreeNode: () => {},
        },
        keymap: { matchesAction: actions.matchesAction },
        sort: {
          setSort: activateRight(actions.setSort),
          handleSortMenuKey: activateRight(actions.handleSortMenuKey),
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

  // Update right pane path capabilities when currentPath changes
  $effect(() => {
    const path = String(state.rightPane.currentPath || "").trim();
    if (!path) {
      state.rightPane.currentPathCapabilities = {
        can_read: true, can_create: true, can_rename: true, can_copy: true,
        can_move: true, can_delete: true, can_archive_create: true, can_archive_extract: true,
      };
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { fsGetCapabilities } = await import("$lib/utils/tauri_fs");
        const capabilities = await fsGetCapabilities(path);
        if (cancelled) return;
        if (state.rightPane.currentPath === path) {
          state.rightPane.currentPathCapabilities = {
            can_read: Boolean(capabilities?.can_read ?? true),
            can_create: Boolean(capabilities?.can_create ?? true),
            can_rename: Boolean(capabilities?.can_rename ?? true),
            can_copy: Boolean(capabilities?.can_copy ?? true),
            can_move: Boolean(capabilities?.can_move ?? true),
            can_delete: Boolean(capabilities?.can_delete ?? true),
            can_archive_create: Boolean(capabilities?.can_archive_create ?? true),
            can_archive_extract: Boolean(capabilities?.can_archive_extract ?? true),
          };
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
    function handleGitPanelToggle(event) {
      if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "g" && event.key !== "G") return;
      const activeEl = document.activeElement;
      if (activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA") return;
      const isInModal =
        typeof activeEl?.closest === "function" &&
        activeEl.closest(".modal, .modal-backdrop, .dropdown, .sort-menu, .context-menu");
      if (isInModal) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.gitPanelOpen) { void closeGitPanel(); } else { void openGitPanel(); }
    }
    window.addEventListener("keydown", handleGitPanelToggle, { capture: true });
    return () => window.removeEventListener("keydown", handleGitPanelToggle, { capture: true });
  });

  // ── Git panel CSS offset ──────────────────────────────────────────────────
  // When the panel is open, push the main content left by the panel width via a
  // CSS custom property so the panel never overlaps either pane.
  $effect(() => {
    document.documentElement.style.setProperty(
      "--git-panel-offset",
      state.gitPanelOpen ? "300px" : "0px"
    );
  });

  function openGitPanel()  { state.gitPanelOpen = true; }
  function closeGitPanel() { state.gitPanelOpen = false; }

  // F3 key to toggle dual/single pane mode
  $effect(() => {
    function handleDualPaneToggle(event) {
      const isF3 =
        !event.ctrlKey && !event.altKey && !event.metaKey &&
        (event.key === "F3" || event.code === "F3" || event.keyCode === 114);
      if (!isF3) return;
      const activeEl = document.activeElement;
      if (!activeEl) return;
      const isInInput = activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA";
      const isInModal =
        typeof activeEl.closest === "function" &&
        activeEl.closest(".modal, .modal-backdrop, .dropdown, .sort-menu, .context-menu");
      if (isInInput || isInModal) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const next = state.layoutMode === "dual" ? "single" : "dual";
      state.layoutMode = next;
      if (next === "dual") {
        state.activePaneId = "left";
        if (!state.rightPane.currentPath && state.currentPath) {
          rightDirHelpers.loadDir(state.currentPath);
        }
      }
    }
    window.addEventListener("keydown", handleDualPaneToggle, { capture: true });
    return () => window.removeEventListener("keydown", handleDualPaneToggle, { capture: true });
  });

  // Ctrl+W: cross-pane WinMerge comparison (dual mode only)
  $effect(() => {
    function handleWinMergeCrossPane(event) {
      const isCtrlW =
        event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey &&
        (event.key === "w" || event.key === "W");
      if (!isCtrlW) return;
      if (state.layoutMode !== "dual") return;
      const activeEl = document.activeElement;
      if (!activeEl) return;
      const isInInput = activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA";
      const isInModal =
        typeof activeEl.closest === "function" &&
        activeEl.closest(".modal, .modal-backdrop, .dropdown, .sort-menu, .context-menu");
      if (isInInput || isInModal) return;
      const leftSelected = state.selectedPaths;
      const rightSelected = state.rightPane.selectedPaths;
      if (leftSelected.length === 1 && rightSelected.length === 1) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void winmergeCompareFiles(leftSelected[0], rightSelected[0]).catch((err) => {
          actions.showError(err);
        });
      }
    }
    window.addEventListener("keydown", handleWinMergeCrossPane, { capture: true });
    return () => window.removeEventListener("keydown", handleWinMergeCrossPane, { capture: true });
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

  function normalizeSettingsConfig(config) {
    return {
      ui_theme: config?.ui_theme === "dark" ? "dark" : "light",
      ui_language: config?.ui_language === "ja" ? "ja" : "en",
      ui_file_icon_mode:
        config?.ui_file_icon_mode === "simple" || config?.ui_file_icon_mode === "none"
          ? config.ui_file_icon_mode
          : "by_type",
      perf_dir_stats_timeout_ms: Math.max(500, Number(config?.perf_dir_stats_timeout_ms || 3000)),
      external_vscode_path: String(config?.external_vscode_path || ""),
      external_git_client_path: String(config?.external_git_client_path || ""),
      external_winmerge_path: String(config?.external_winmerge_path || ""),
      external_terminal_profile: String(config?.external_terminal_profile || ""),
      external_terminal_profile_cmd: String(config?.external_terminal_profile_cmd || ""),
      external_terminal_profile_powershell: String(
        config?.external_terminal_profile_powershell || ""
      ),
      external_terminal_profile_wsl: String(config?.external_terminal_profile_wsl || ""),
    };
  }

  const SETTINGS_PATH_MAX_LEN = 1024;
  const SETTINGS_PROFILE_MAX_LEN = 256;

  function buildSettingsSavePatch(baseValues, nextValues) {
    const base = normalizeSettingsConfig(baseValues || {});
    const next = normalizeSettingsConfig(nextValues || {});
    return {
      uiTheme: base.ui_theme !== next.ui_theme ? next.ui_theme : null,
      uiLanguage: base.ui_language !== next.ui_language ? next.ui_language : null,
      uiFileIconMode: base.ui_file_icon_mode !== next.ui_file_icon_mode ? next.ui_file_icon_mode : null,
      perfDirStatsTimeoutMs:
        Number(base.perf_dir_stats_timeout_ms) !== Number(next.perf_dir_stats_timeout_ms)
          ? Number(next.perf_dir_stats_timeout_ms)
          : null,
      externalVscodePath:
        base.external_vscode_path !== next.external_vscode_path ? next.external_vscode_path : null,
      externalGitClientPath:
        base.external_git_client_path !== next.external_git_client_path
          ? next.external_git_client_path
          : null,
      externalWinmergePath:
        base.external_winmerge_path !== next.external_winmerge_path
          ? next.external_winmerge_path
          : null,
      externalTerminalProfile:
        base.external_terminal_profile !== next.external_terminal_profile
          ? next.external_terminal_profile
          : null,
      externalTerminalProfileCmd:
        base.external_terminal_profile_cmd !== next.external_terminal_profile_cmd
          ? next.external_terminal_profile_cmd
          : null,
      externalTerminalProfilePowershell:
        base.external_terminal_profile_powershell !== next.external_terminal_profile_powershell
          ? next.external_terminal_profile_powershell
          : null,
      externalTerminalProfileWsl:
        base.external_terminal_profile_wsl !== next.external_terminal_profile_wsl
          ? next.external_terminal_profile_wsl
          : null,
    };
  }

  function hasSettingsPatchChanges(patch) {
    return Object.values(patch || {}).some((value) => value !== null && value !== undefined);
  }

  function validateSettingsDraft(values) {
    const theme = String(values?.ui_theme || "");
    if (theme !== "light" && theme !== "dark") {
      return t("settings.validation_invalid_theme");
    }

    const language = String(values?.ui_language || "");
    if (language !== "en" && language !== "ja") {
      return t("settings.validation_invalid_language");
    }

    const iconMode = String(values?.ui_file_icon_mode || "");
    if (iconMode !== "by_type" && iconMode !== "simple" && iconMode !== "none") {
      return t("settings.validation_invalid_icon_mode");
    }

    const timeoutMs = Number(values?.perf_dir_stats_timeout_ms ?? 0);
    if (!Number.isFinite(timeoutMs) || timeoutMs < 500 || timeoutMs > 3_600_000) {
      return t("settings.validation_timeout_range");
    }

    const pathValues = [values?.external_vscode_path, values?.external_git_client_path, values?.external_winmerge_path];
    for (const raw of pathValues) {
      const value = String(raw || "");
      if (value.length > SETTINGS_PATH_MAX_LEN) {
        return t("settings.validation_path_too_long");
      }
      if (/\r|\n/.test(value)) {
        return t("settings.validation_single_line");
      }
    }

    const profileValues = [
      values?.external_terminal_profile,
      values?.external_terminal_profile_cmd,
      values?.external_terminal_profile_powershell,
      values?.external_terminal_profile_wsl,
    ];
    for (const raw of profileValues) {
      const value = String(raw || "");
      if (value.length > SETTINGS_PROFILE_MAX_LEN) {
        return t("settings.validation_profile_too_long");
      }
      if (/\r|\n/.test(value)) {
        return t("settings.validation_single_line");
      }
    }

    return "";
  }
  const KNOWN_SHORTCUT_CONFLICTS = {
    [normalizeKeyString("Ctrl+Shift+Esc")]: "settings.shortcut_conflict_task_manager",
    [normalizeKeyString("Alt+Shift")]: "settings.shortcut_conflict_input_switch",
    [normalizeKeyString("Ctrl+Alt+ArrowUp")]: "settings.shortcut_conflict_display_driver",
    [normalizeKeyString("Ctrl+Alt+ArrowDown")]: "settings.shortcut_conflict_display_driver",
    [normalizeKeyString("Ctrl+Alt+ArrowLeft")]: "settings.shortcut_conflict_display_driver",
    [normalizeKeyString("Ctrl+Alt+ArrowRight")]: "settings.shortcut_conflict_display_driver",
  };

  function collectSettingsShortcutConflicts() {
    const knownItems = [];
    const knownSeen = new Set();
    const bindingActions = new Map();

    for (const action of KEYMAP_ACTIONS) {
      const bindings = keymapBindings.getActionBindings(action.id);
      for (const binding of bindings) {
        const normalized = normalizeKeyString(binding);
        if (!normalized) continue;

        const reasonKey = KNOWN_SHORTCUT_CONFLICTS[normalized];
        if (reasonKey) {
          const dedupeKey = `${action.id}:${normalized}:${reasonKey}`;
          if (!knownSeen.has(dedupeKey)) {
            knownSeen.add(dedupeKey);
            knownItems.push(
              t("settings.shortcut_conflict_item", {
                binding: normalized,
                action: t(action.labelKey),
                reason: t(reasonKey),
              })
            );
          }
        }

        const current = bindingActions.get(normalized) || [];
        if (!current.includes(action.id)) {
          current.push(action.id);
        }
        bindingActions.set(normalized, current);
      }
    }

    const internalItems = [];
    for (const [binding, actionIds] of bindingActions.entries()) {
      if (!Array.isArray(actionIds) || actionIds.length <= 1) continue;
      const actionLabels = actionIds
        .map((id) => {
          const meta = KEYMAP_ACTIONS.find((entry) => entry.id === id);
          return meta ? t(meta.labelKey) : id;
        })
        .join(", ");
      internalItems.push(
        t("settings.shortcut_conflict_internal_item", {
          binding,
          actions: actionLabels,
        })
      );
    }

    settingsShortcutConflicts = [...knownItems, ...internalItems];
  }

  function normalizeSettingsSection(value) {
    const section = String(value || "").trim().toLowerCase();
    if (section === "external" || section === "advanced") {
      return section;
    }
    return "general";
  }

  async function openSettingsModal(options = undefined) {
    settingsInitialSection = normalizeSettingsSection(options?.initialSection);
    settingsSaving = false;
    settingsError = "";
    settingsTesting = false;
    settingsTestMessage = "";
    settingsTestIsError = false;
    settingsReporting = false;
    settingsReportMessage = "";
    settingsReportIsError = false;
    settingsGdriveAuthError = "";
    settingsGdriveAuthMessage = "";
    settingsGdriveWorkcopyError = "";
    settingsGdriveWorkcopyMessage = "";
    try {
      const config = await invoke("config_get");
      settingsInitial = normalizeSettingsConfig(config || {});
    } catch (err) {
      settingsError = formatError(err, "failed to load config", t);
      settingsInitial = normalizeSettingsConfig({
        ui_theme: state.ui_theme,
        ui_language: state.ui_language,
        ui_file_icon_mode: state.ui_file_icon_mode,
        perf_dir_stats_timeout_ms: state.dirStatsTimeoutMs,
      });
    }

    try {
      const profiles = await invoke("external_list_terminal_profiles");
      settingsProfiles = Array.isArray(profiles) ? profiles : [];
    } catch {
      settingsProfiles = [];
    }

    collectSettingsShortcutConflicts();
    settingsOpen = true;
  }

  function closeSettingsModal() {
    if (settingsSaving) return;
    settingsOpen = false;
    settingsError = "";
    queueMicrotask(() => {
      shellRefs.listEl?.focus?.();
    });
  }

  async function saveSettings(values) {
    settingsSaving = true;
    settingsError = "";

    const normalizedValues = normalizeSettingsConfig(values || {});
    const validationError = validateSettingsDraft(normalizedValues);
    if (validationError) {
      settingsSaving = false;
      settingsError = validationError;
      return;
    }

    const patch = buildSettingsSavePatch(settingsInitial, normalizedValues);
    if (!hasSettingsPatchChanges(patch)) {
      settingsSaving = false;
      actions.setStatusMessage(t("settings.no_changes"), 1200);
      settingsOpen = false;
      queueMicrotask(() => {
        shellRefs.listEl?.focus?.();
      });
      return;
    }

    try {
      const saved = await invoke("config_save_preferences", patch);

      settingsInitial = normalizeSettingsConfig(saved || normalizedValues);
      state.ui_theme = settingsInitial.ui_theme;
      state.ui_language = settingsInitial.ui_language;
      state.ui_file_icon_mode = settingsInitial.ui_file_icon_mode;
      state.dirStatsTimeoutMs = settingsInitial.perf_dir_stats_timeout_ms;
      actions.setStatusMessage(t("settings.saved"), 1500);
      settingsOpen = false;
      settingsError = "";
      queueMicrotask(() => {
        shellRefs.listEl?.focus?.();
      });
    } catch (err) {
      settingsError = formatError(err, "save failed", t);
    } finally {
      settingsSaving = false;
    }
  }
  async function openConfigFromSettings() {
    try {
      await invoke("config_open_in_editor");
      actions.setStatusMessage(t("status.opened_config"), 1500);
    } catch (err) {
      settingsError = `${t("status.open_failed")}: ${formatError(err, "unknown error", t)}`;
    }
  }

  async function createSettingsBackup() {
    settingsReporting = true;
    settingsReportMessage = "";
    settingsReportIsError = false;
    try {
      const backupPath = await invoke("config_create_backup");
      settingsReportMessage = t("settings.backup_ok", { path: String(backupPath || "") });
      actions.setStatusMessage(t("settings.backup_ready"), 1800);
    } catch (err) {
      settingsReportIsError = true;
      settingsReportMessage = t("settings.backup_failed", {
        error: formatError(err, "unknown error", t),
      });
    } finally {
      settingsReporting = false;
    }
  }

  async function restoreSettingsBackup() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(t("settings.restore_confirm"));
      if (!ok) return;
    }

    settingsReporting = true;
    settingsReportMessage = "";
    settingsReportIsError = false;
    try {
      const restored = await invoke("config_restore_latest_backup");
      settingsInitial = normalizeSettingsConfig(restored || {});
      state.ui_theme = settingsInitial.ui_theme;
      state.ui_language = settingsInitial.ui_language;
      state.ui_file_icon_mode = settingsInitial.ui_file_icon_mode;
      state.dirStatsTimeoutMs = settingsInitial.perf_dir_stats_timeout_ms;
      settingsReportMessage = t("settings.restore_ok");
      actions.setStatusMessage(t("settings.restore_ready"), 1800);
    } catch (err) {
      settingsReportIsError = true;
      settingsReportMessage = t("settings.restore_failed", {
        error: formatError(err, "unknown error", t),
      });
    } finally {
      settingsReporting = false;
    }
  }

  async function exportDiagnosticReport(options) {
    settingsReporting = true;
    settingsReportMessage = "";
    settingsReportIsError = false;
    try {
      const result = await invoke("config_generate_diagnostic_report", {
        openAfterWrite: Boolean(options?.open_after_write ?? true),
        maskSensitivePaths: Boolean(options?.mask_sensitive_paths ?? true),
        asZip: Boolean(options?.as_zip ?? false),
        copyPathToClipboard: Boolean(options?.copy_path_to_clipboard ?? false),
      });
      const reportPath = String(result?.report_path || result?.reportPath || "");
      const copied = Boolean(result?.copied_to_clipboard ?? result?.copiedToClipboard ?? false);
      settingsReportMessage = copied
        ? t("settings.report_ok_copied", { path: reportPath })
        : t("settings.report_ok", { path: reportPath });
      actions.setStatusMessage(t("settings.report_ready"), 1800);
    } catch (err) {
      settingsReportIsError = true;
      settingsReportMessage = t("settings.report_failed", {
        error: formatError(err, "unknown error", t),
      });
    } finally {
      settingsReporting = false;
    }
  }

  function normalizeExecutablePath(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      return raw.slice(1, -1).trim();
    }
    return raw;
  }

  async function runSettingsDiagnostic(kind, values) {
    settingsTesting = true;
    settingsTestMessage = "";
    settingsTestIsError = false;
    settingsReporting = false;
    settingsReportMessage = "";
    settingsReportIsError = false;

    const targetPath = String(state.currentPath || "").trim();
    if (!targetPath) {
      settingsTestIsError = true;
      settingsTestMessage = t("settings.test_path_missing");
      settingsTesting = false;
      return;
    }

    try {
      if (kind === "terminal") {
        const profile = String(values?.external_terminal_profile || "").trim();
        if (profile) {
          await invoke("external_open_terminal_profile", {
            path: targetPath,
            profile,
          });
        } else {
          await invoke("external_open_terminal_kind", {
            path: targetPath,
            kind: "cmd",
          });
        }
        settingsTestMessage = t("settings.test_ok", { target: t("settings.test_terminal") });
      } else if (kind === "vscode") {
        const command = normalizeExecutablePath(values?.external_vscode_path);
        if (command) {
          try {
            await invoke("external_open_custom", { command, args: [targetPath] });
          } catch {
            await invoke("external_open_vscode", { path: targetPath });
          }
        } else {
          await invoke("external_open_vscode", { path: targetPath });
        }
        settingsTestMessage = t("settings.test_ok", { target: t("settings.test_vscode") });
      } else if (kind === "git") {
        const command = normalizeExecutablePath(values?.external_git_client_path);
        if (command) {
          try {
            await invoke("external_open_custom", { command, args: [targetPath] });
          } catch {
            await invoke("external_open_git_client", { path: targetPath });
          }
        } else {
          await invoke("external_open_git_client", { path: targetPath });
        }
        settingsTestMessage = t("settings.test_ok", { target: t("settings.test_git_client") });
      } else {
        throw new Error("unknown diagnostics target");
      }
      actions.setStatusMessage(settingsTestMessage, 1800);
    } catch (err) {
      settingsTestIsError = true;
      settingsTestMessage = t("settings.test_failed", {
        target:
          kind === "terminal"
            ? t("settings.test_terminal")
            : kind === "vscode"
              ? t("settings.test_vscode")
              : t("settings.test_git_client"),
        error: formatError(err, "unknown error", t),
      });
    } finally {
      settingsTesting = false;
    }
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
    }, 250);

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


