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

  /** @type {() => Promise<void>} */
  let updateWindowBounds = async () => {};

  /** @type {number} */
  let dirStatsRequestId = 0;

  /** @type {ReturnType<typeof setTimeout> | null} */
  let uiSaveTimer = null;
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
</script>

<PageShellBindings
  bind:state={state}
  bind:refs={shellRefs}
  {...pageShellProps}
/>


