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
  import { toGdriveResourceRef } from "$lib/utils/resource_ref";
  import { fsGetCapabilities, fsGetCapabilitiesByRef } from "$lib/utils/tauri_fs";
  import {
    gdriveAuthCompleteExchange,
    gdriveAuthGetStatus,
    gdriveAuthLoadClientSecret,
    gdriveAuthStoreClientSecret,
    gdriveAuthSignOut,
    gdriveAuthStartSession,
    gdriveAuthValidateCallback,
    gdriveAuthWaitForCallback,
  } from "$lib/utils/tauri_gdrive_auth";

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
    gdrive_oauth_client_id: "",
    gdrive_oauth_redirect_uri: "http://127.0.0.1:45123/oauth2/callback",
    gdrive_account_id: "",
  });
  const GDRIVE_DEFAULT_REDIRECT_URI = "http://127.0.0.1:45123/oauth2/callback";
  const GDRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
  const DEFAULT_GDRIVE_AUTH_STATUS = {
    phase: "signed_out",
    backendMode: "stub",
    accountId: null,
    grantedScopes: [],
    refreshTokenPersisted: false,
    pendingStartedAtMs: null,
    lastError: "",
    tokenStoreBackend: "",
    tokenStoreAvailable: false,
  };
  let settingsGdriveAuthStatus = $state({ ...DEFAULT_GDRIVE_AUTH_STATUS });
  let settingsGdriveAuthLoading = $state(false);
  let settingsGdriveAuthBusy = $state(false);
  let settingsGdriveAuthError = $state("");
  let settingsGdriveAuthMessage = $state("");
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
        const gdriveRef = toGdriveResourceRef(path);
        const capabilities = gdriveRef
          ? await fsGetCapabilitiesByRef(gdriveRef)
          : await fsGetCapabilities(path);
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
    const redirectUriRaw = String(config?.gdrive_oauth_redirect_uri || "").trim();
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
      gdrive_oauth_client_id: String(config?.gdrive_oauth_client_id || ""),
      gdrive_oauth_redirect_uri: redirectUriRaw || GDRIVE_DEFAULT_REDIRECT_URI,
      gdrive_account_id: String(config?.gdrive_account_id || ""),
    };
  }

  const SETTINGS_PATH_MAX_LEN = 1024;
  const SETTINGS_PROFILE_MAX_LEN = 256;
  const SETTINGS_ACCOUNT_ID_MAX_LEN = 320;
  const SETTINGS_REDIRECT_URI_MAX_LEN = 1024;

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
      gdriveOauthClientId:
        base.gdrive_oauth_client_id !== next.gdrive_oauth_client_id
          ? next.gdrive_oauth_client_id
          : null,
      gdriveOauthRedirectUri:
        base.gdrive_oauth_redirect_uri !== next.gdrive_oauth_redirect_uri
          ? next.gdrive_oauth_redirect_uri
          : null,
      gdriveAccountId:
        base.gdrive_account_id !== next.gdrive_account_id ? next.gdrive_account_id : null,
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

    const gdriveClientId = String(values?.gdrive_oauth_client_id || "");
    if (gdriveClientId.length > SETTINGS_PATH_MAX_LEN) {
      return t("settings.validation_path_too_long");
    }
    if (/\r|\n/.test(gdriveClientId)) {
      return t("settings.validation_single_line");
    }

    const gdriveRedirectUri = String(values?.gdrive_oauth_redirect_uri || "");
    if (gdriveRedirectUri.length > SETTINGS_REDIRECT_URI_MAX_LEN) {
      return t("settings.validation_path_too_long");
    }
    if (/\r|\n/.test(gdriveRedirectUri)) {
      return t("settings.validation_single_line");
    }

    const gdriveAccountId = String(values?.gdrive_account_id || "");
    if (gdriveAccountId.length > SETTINGS_ACCOUNT_ID_MAX_LEN) {
      return t("settings.validation_profile_too_long");
    }
    if (/\r|\n/.test(gdriveAccountId)) {
      return t("settings.validation_single_line");
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
    settingsGdriveAuthError = "";
    settingsGdriveAuthMessage = "";
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
        gdrive_oauth_client_id: "",
        gdrive_oauth_redirect_uri: GDRIVE_DEFAULT_REDIRECT_URI,
        gdrive_account_id: "",
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
    void refreshGdriveAuthStatus();
  }

  function closeSettingsModal() {
    if (settingsSaving) return;
    settingsOpen = false;
    settingsError = "";
    queueMicrotask(() => {
      shellRefs.listEl?.focus?.();
    });
  }

  function normalizeGdriveAuthStatus(status) {
    const phaseRaw = String(status?.phase || "signed_out").trim();
    const phase = phaseRaw === "pending" || phaseRaw === "authorized" ? phaseRaw : "signed_out";
    const backendRaw = String(status?.backendMode || "stub").trim();
    const backendMode = backendRaw === "real" ? "real" : "stub";
    const accountIdRaw = status?.accountId;
    const accountId =
      typeof accountIdRaw === "string" && accountIdRaw.trim() ? accountIdRaw.trim() : null;
    const grantedScopes = Array.isArray(status?.grantedScopes)
      ? status.grantedScopes
          .map((scope) => String(scope || "").trim())
          .filter((scope) => Boolean(scope))
      : [];
    const pendingMsRaw = Number(status?.pendingStartedAtMs ?? Number.NaN);
    const pendingStartedAtMs = Number.isFinite(pendingMsRaw) ? Math.trunc(pendingMsRaw) : null;
    return {
      phase,
      backendMode,
      accountId,
      grantedScopes,
      refreshTokenPersisted: Boolean(status?.refreshTokenPersisted),
      pendingStartedAtMs,
      lastError: String(status?.lastError || ""),
      tokenStoreBackend: String(status?.tokenStoreBackend || ""),
      tokenStoreAvailable: Boolean(status?.tokenStoreAvailable),
    };
  }

  async function refreshGdriveAuthStatus() {
    settingsGdriveAuthLoading = true;
    settingsGdriveAuthError = "";
    try {
      const status = await gdriveAuthGetStatus();
      settingsGdriveAuthStatus = normalizeGdriveAuthStatus(status);
    } catch (err) {
      settingsGdriveAuthError = formatError(err, "failed to read gdrive auth status", t);
      settingsGdriveAuthStatus = { ...DEFAULT_GDRIVE_AUTH_STATUS };
    } finally {
      settingsGdriveAuthLoading = false;
    }
  }

  function parseGdriveCallbackParams(callbackUrl) {
    const input = String(callbackUrl || "").trim();
    if (!input) {
      throw new Error(t("settings.gdrive.callback_missing"));
    }
    let parsed;
    try {
      parsed = new URL(input);
    } catch {
      parsed = new URL(input, "http://localhost");
    }
    const stateParam = String(parsed.searchParams.get("state") || "").trim();
    const codeParam = String(parsed.searchParams.get("code") || "").trim();
    if (!stateParam || !codeParam) {
      throw new Error(t("settings.gdrive.callback_parse_error"));
    }
    return { state: stateParam, code: codeParam };
  }

  function normalizeTokenScopeList(scopeText, fallbackScopes) {
    const parsedScopes = String(scopeText || "")
      .trim()
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter((scope) => scope === GDRIVE_READONLY_SCOPE);
    if (parsedScopes.length > 0) {
      return [...new Set(parsedScopes)];
    }
    const normalizedFallback = Array.isArray(fallbackScopes)
      ? fallbackScopes
          .map((scope) => String(scope || "").trim())
          .filter((scope) => scope === GDRIVE_READONLY_SCOPE)
      : [];
    return normalizedFallback.length > 0 ? [...new Set(normalizedFallback)] : [GDRIVE_READONLY_SCOPE];
  }

  async function exchangeGoogleAuthCode(validated, clientSecretRaw = "") {
    const form = new URLSearchParams();
    form.set("client_id", String(validated?.clientId || ""));
    form.set("code", String(validated?.code || ""));
    form.set("code_verifier", String(validated?.codeVerifier || ""));
    form.set("redirect_uri", String(validated?.redirectUri || ""));
    form.set("grant_type", "authorization_code");
    const clientSecret = String(clientSecretRaw || "").trim();
    if (clientSecret) {
      form.set("client_secret", clientSecret);
    }

    let response;
    try {
      response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form.toString(),
      });
    } catch {
      throw new Error(t("settings.gdrive.token_exchange_network_error"));
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const detail = String(payload?.error_description || payload?.error || "").trim();
      if (!clientSecret && detail.toLowerCase().includes("client_secret is missing")) {
        throw new Error(t("settings.gdrive.token_exchange_requires_client_secret"));
      }
      if (detail) {
        throw new Error(
          t("settings.gdrive.token_exchange_failed_with_detail", {
            detail,
          })
        );
      }
      throw new Error(t("settings.gdrive.token_exchange_failed"));
    }

    const accessToken = String(payload?.access_token || "").trim();
    if (!accessToken) {
      throw new Error(t("settings.gdrive.token_exchange_no_access_token"));
    }

    const refreshToken = String(payload?.refresh_token || "").trim();
    const expiresInRaw = Number(payload?.expires_in ?? Number.NaN);
    const expiresInSec = Number.isFinite(expiresInRaw) ? Math.max(60, Math.trunc(expiresInRaw)) : 3600;
    return {
      accessToken,
      expiresInSec,
      refreshToken: refreshToken || null,
      scopes: normalizeTokenScopeList(payload?.scope, validated?.scopes),
    };
  }

  async function startGdriveAuth(values) {
    const clientId = String(values?.client_id || "").trim();
    const redirectUri = String(values?.redirect_uri || "").trim();
    if (!clientId || !redirectUri) {
      settingsGdriveAuthError = t("settings.gdrive.client_or_redirect_required");
      return;
    }

    settingsGdriveAuthBusy = true;
    settingsGdriveAuthError = "";
    settingsGdriveAuthMessage = "";
    try {
      const started = await gdriveAuthStartSession(clientId, redirectUri, [GDRIVE_READONLY_SCOPE]);
      await openUrl(started.authorizationUrl);
      settingsGdriveAuthMessage = t("settings.gdrive.started_opened");
      const captured = await gdriveAuthWaitForCallback(180000);
      if (values && typeof values === "object") {
        values.callback_url = String(captured?.callbackUrl || "");
      }
      settingsGdriveAuthMessage = t("settings.gdrive.callback_auto_captured");
      await refreshGdriveAuthStatus();
    } catch (err) {
      settingsGdriveAuthError = formatError(err, "failed to start gdrive auth", t);
    } finally {
      settingsGdriveAuthBusy = false;
    }
  }

  async function completeGdriveAuth(values) {
    const accountId = String(values?.account_id || "").trim();
    const clientIdToPersist = String(values?.client_id || "").trim();
    const redirectUriToPersist = String(values?.redirect_uri || "").trim();
    if (!accountId) {
      settingsGdriveAuthError = t("settings.gdrive.account_required");
      return;
    }

    settingsGdriveAuthBusy = true;
    settingsGdriveAuthError = "";
    settingsGdriveAuthMessage = "";
    try {
      const callback = parseGdriveCallbackParams(values?.callback_url);
      const validated = await gdriveAuthValidateCallback(callback.state, callback.code);
      const refreshTokenRaw = String(values?.refresh_token || "").trim();
      const enteredClientSecret = String(values?.client_secret || "").trim();
      let resolvedClientSecret = enteredClientSecret;
      const validatedClientId = String(validated?.clientId || "").trim();
      if (refreshTokenRaw.length === 0 && !resolvedClientSecret && validatedClientId) {
        try {
          const loaded = await gdriveAuthLoadClientSecret(validatedClientId);
          resolvedClientSecret = String(loaded || "").trim();
        } catch {
          resolvedClientSecret = "";
        }
      }
      const exchanged =
        refreshTokenRaw.length > 0
          ? {
              accessToken: null,
              expiresInSec: null,
              refreshToken: refreshTokenRaw,
              scopes: normalizeTokenScopeList("", validated?.scopes),
            }
          : await exchangeGoogleAuthCode(validated, resolvedClientSecret);

      if (refreshTokenRaw.length === 0 && enteredClientSecret && validatedClientId) {
        try {
          await gdriveAuthStoreClientSecret(validatedClientId, enteredClientSecret);
        } catch {
          // continue sign-in flow even if secure storage is unavailable
        }
      }
      const status = await gdriveAuthCompleteExchange(
        accountId,
        exchanged.scopes,
        exchanged.refreshToken,
        exchanged.accessToken,
        exchanged.expiresInSec
      );
      settingsGdriveAuthStatus = normalizeGdriveAuthStatus(status);
      try {
        const savedConfig = await invoke("config_save_preferences", {
          gdriveOauthClientId: clientIdToPersist || null,
          gdriveOauthRedirectUri: redirectUriToPersist || null,
          gdriveAccountId: accountId,
        });
        settingsInitial = normalizeSettingsConfig(savedConfig || settingsInitial);
      } catch {
        // keep auth success even if config persistence fails
      }
      settingsGdriveAuthMessage = refreshTokenRaw.length > 0
        ? t("settings.gdrive.complete_done_manual")
        : t("settings.gdrive.complete_done");
    } catch (err) {
      settingsGdriveAuthError = formatError(err, "failed to complete gdrive auth", t);
    } finally {
      settingsGdriveAuthBusy = false;
    }
  }

  async function signOutGdrive(values) {
    settingsGdriveAuthBusy = true;
    settingsGdriveAuthError = "";
    settingsGdriveAuthMessage = "";
    try {
      const accountId = String(values?.account_id || "").trim();
      const status = await gdriveAuthSignOut(accountId || null);
      settingsGdriveAuthStatus = normalizeGdriveAuthStatus(status);
      settingsGdriveAuthMessage = t("settings.gdrive.sign_out_done");
    } catch (err) {
      settingsGdriveAuthError = formatError(err, "failed to sign out gdrive", t);
    } finally {
      settingsGdriveAuthBusy = false;
    }
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
    gdriveAuthStatus={settingsGdriveAuthStatus}
    gdriveAuthLoading={settingsGdriveAuthLoading}
    gdriveAuthBusy={settingsGdriveAuthBusy}
    gdriveAuthError={settingsGdriveAuthError}
    gdriveAuthMessage={settingsGdriveAuthMessage}
    error={settingsError}
    onCancel={closeSettingsModal}
    onSave={saveSettings}
    onOpenConfig={openConfigFromSettings}
    onBackupConfig={createSettingsBackup}
    onRestoreConfig={restoreSettingsBackup}
    onExportReport={exportDiagnosticReport}
    onRunDiagnostic={runSettingsDiagnostic}
    onGdriveAuthRefresh={refreshGdriveAuthStatus}
    onGdriveAuthStart={startGdriveAuth}
    onGdriveAuthComplete={completeGdriveAuth}
    onGdriveAuthSignOut={signOutGdrive}
    {trapModalTab}
    {autofocus}
  />
{/if}


