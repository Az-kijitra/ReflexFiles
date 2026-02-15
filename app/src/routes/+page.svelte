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
  import { setupPageInitFromState } from "$lib/page_init_runtime";
  import { buildInitPageRuntimeInputsFromPageState } from "$lib/page_init_runtime_inputs_from_page_state";
  import { setupPageActionsRuntimeFromState } from "$lib/page_actions_runtime_from_state";
  import { buildPageViewRuntimeBundleInputsFromState } from "$lib/page_view_runtime_bundle_inputs_from_state";
  import { createPageStateDefaults } from "$lib/page_state_defaults";
  import { createPageViewRuntimeBundle } from "$lib/page_view_runtime_bundle";
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

  import PageShellBindings from "$lib/components/PageShellBindings.svelte";
  import SettingsModal from "$lib/components/modals/SettingsModal.svelte";

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

  const pageMountInputs = createPageMountRuntime({
    onMount,
    inputs: buildPageMountRuntimeInputsFromPageState({
      state: () => state,
      shellRefs: () => shellRefs,
      overlayRefs: () => overlayRefs,
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
  });
  showErrorImpl = showErrorAction;
  $effect(() => actions.recomputeSearch());
  $effect(() => actions.recomputeDropdownItems());
  $effect(() => actions.recomputeStatusItems());
  $effect(() => actions.clampDropdownSelection());

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

  const viewRuntime = createPageViewRuntimeBundle(
    buildPageViewRuntimeBundleInputsFromState({
      state: () => state,
      shellRefs: () => shellRefs,
      overlayRefs: () => overlayRefs,
      pageActions,
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
  const viewProps = $derived(viewRuntime.getViewProps());

  const pageShellProps = $derived({
    showTree: state.showTree,
    statusItems: state.statusItems,
    viewProps,
    overlayBindings,
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

    const pathValues = [values?.external_vscode_path, values?.external_git_client_path];
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
    [normalizeKeyString("Ctrl+Alt+G")]: "settings.shortcut_conflict_google_drive",
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

  async function openSettingsModal() {
    settingsSaving = false;
    settingsError = "";
    settingsTesting = false;
    settingsTestMessage = "";
    settingsTestIsError = false;
    settingsReporting = false;
    settingsReportMessage = "";
    settingsReportIsError = false;
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
    const handler = () => {
      void openSettingsModal();
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
</script>

<PageShellBindings
  bind:state={state}
  bind:refs={shellRefs}
  {...pageShellProps}
/>

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


