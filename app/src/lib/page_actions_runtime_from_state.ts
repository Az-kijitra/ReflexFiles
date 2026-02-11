import { applyPageActionGroups } from "./page_action_groups_apply";
import { setupPageActionsBundle } from "./page_actions_bundle";
import { buildJumpHandlersInputsFromState } from "./page_jump_handlers_inputs_from_state";
import { setupJumpHandlersBundle } from "./page_jump_setup";
import { buildListFocusMoversInputsFromState } from "./page_list_focus_inputs_from_state";
import { setupListFocusMovers } from "./page_list_focus_setup";
import { buildMenuRuntimeInputsFromState } from "./page_menu_runtime_inputs_from_state";
import { setupMenuRuntime } from "./page_menu_runtime";

/**
 * @param {{
 *   state: any | (() => any);
 *   actions: Record<string, any>;
 *   overlayRefs: {
 *     deleteModalEl: HTMLElement | null;
 *     renameInputEl: HTMLInputElement | null;
 *     renameModalEl: HTMLElement | null;
 *     createInputEl: HTMLInputElement | null;
 *     createModalEl: HTMLElement | null;
 *     jumpUrlInputEl: HTMLInputElement | null;
 *     jumpUrlModalEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *     dropdownEl: HTMLElement | null;
 *     searchInputEl: HTMLInputElement | null;
 *     propertiesModalEl: HTMLElement | null;
 *     propertiesCloseButton: HTMLButtonElement | null;
 *   } | (() => {
 *     deleteModalEl: HTMLElement | null;
 *     renameInputEl: HTMLInputElement | null;
 *     renameModalEl: HTMLElement | null;
 *     createInputEl: HTMLInputElement | null;
 *     createModalEl: HTMLElement | null;
 *     jumpUrlInputEl: HTMLInputElement | null;
 *     jumpUrlModalEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *     dropdownEl: HTMLElement | null;
 *     searchInputEl: HTMLInputElement | null;
 *     propertiesModalEl: HTMLElement | null;
 *     propertiesCloseButton: HTMLButtonElement | null;
 *   });
 *   statusTimer: ReturnType<typeof setTimeout> | null;
 *   setStatusTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *   getLoadDir: () => (path: string) => Promise<void>;
 *   getMoveFocusByRow: () => (delta: number, extend?: boolean) => void;
 *   undoLimit: number;
 *   zipPasswordMaxAttempts: number;
 *   t: (key: string, params?: Record<string, string | number>) => string;
 *   tick: typeof import("svelte").tick;
 *   invoke: (command: string, args?: Record<string, any>) => Promise<any>;
 *   invokeExit: () => void;
 *   showError: (err: unknown) => void;
 *   treeNodeName: (node: unknown) => string;
 *   keymapBindings: { getMenuShortcut: (action: string) => string };
 *   dirStatsRequestId: () => number;
 *   setDirStatsRequestId: (value: number) => void;
 *   cacheGetDirStats: (path: string) => any;
 *   cacheSetDirStats: (path: string, stats: any) => void;
 * }} params
 */
export function setupPageActionsRuntimeFromState(params) {
  const state = typeof params.state === "function" ? params.state() : params.state;
  const overlayRefs =
    typeof params.overlayRefs === "function" ? params.overlayRefs() : params.overlayRefs;

  const { pageActions, propertiesActions, pageActionGroups } = setupPageActionsBundle({
    state,
    statusTimer: params.statusTimer,
    setStatusTimer: params.setStatusTimer,
    refs: () => ({
      deleteModalEl: overlayRefs.deleteModalEl,
      renameInputEl: overlayRefs.renameInputEl,
      renameModalEl: overlayRefs.renameModalEl,
      createInputEl: overlayRefs.createInputEl,
      createModalEl: overlayRefs.createModalEl,
      jumpUrlInputEl: overlayRefs.jumpUrlInputEl,
      jumpUrlModalEl: overlayRefs.jumpUrlModalEl,
      contextMenuEl: overlayRefs.contextMenuEl,
      dropdownEl: overlayRefs.dropdownEl,
    }),
    scheduleUiSave: params.actions.scheduleUiSave,
    getLoadDir: params.getLoadDir,
    getMoveFocusByRow: params.getMoveFocusByRow,
    undoLimit: params.undoLimit,
    zipPasswordMaxAttempts: params.zipPasswordMaxAttempts,
    t: params.t,
    tick: params.tick,
    propertiesRefs: {
      propertiesModalEl: overlayRefs.propertiesModalEl,
      propertiesCloseButton: overlayRefs.propertiesCloseButton,
    },
    getDirStatsRequestId: params.dirStatsRequestId,
    setDirStatsRequestId: params.setDirStatsRequestId,
    showError: params.showError,
    cacheGetDirStats: params.cacheGetDirStats,
    cacheSetDirStats: params.cacheSetDirStats,
  });

  applyPageActionGroups(params.actions, pageActionGroups);

  Object.assign(
    params.actions,
    setupJumpHandlersBundle(
      buildJumpHandlersInputsFromState({
        state,
        refs: { dropdownEl: overlayRefs.dropdownEl },
        actions: {
          setDropdownMode: (value) => {
            state.dropdownMode = value;
          },
          setDropdownOpen: (value) => {
            state.dropdownOpen = value;
          },
          setPathInput: (value) => {
            state.pathInput = value;
          },
          setStatusMessage: params.actions.setStatusMessage,
        },
        showError: params.showError,
        deps: {
          t: params.t,
          tick: params.tick,
          invoke: params.invoke,
          treeNodeName: params.treeNodeName,
        },
      })
    )
  );

  Object.assign(
    params.actions,
    setupListFocusMovers(
      buildListFocusMoversInputsFromState({
        state,
        actions: {
          setFocusedIndex: (value) => {
            state.focusedIndex = value;
          },
          selectRange: params.actions.selectRange,
          ensureColumnVisible: params.actions.ensureColumnVisible,
        },
      })
    )
  );

  Object.assign(
    params.actions,
    setupMenuRuntime(
      buildMenuRuntimeInputsFromState({
        state,
        actions: params.actions,
        pageActions,
        overlayRefs,
        t: params.t,
        tick: params.tick,
        getMenuShortcut: params.keymapBindings.getMenuShortcut,
        invokeExit: params.invokeExit,
      })
    )
  );

  return {
    pageActions,
    propertiesActions,
    pageActionGroups,
    showErrorAction: params.actions.showErrorAction,
  };
}
