import { buildPageMountRuntimeInputsFromState } from "./page_mount_runtime_inputs_from_state";

/**
 * @param {{
 *   state: any | (() => any);
 *   shellRefs: {
 *     listEl: HTMLElement | null;
 *     pathInputEl: HTMLInputElement | null;
 *     treeEl: HTMLElement | null;
 *     menuBarEl: HTMLElement | null;
 *   } | (() => {
 *     listEl: HTMLElement | null;
 *     pathInputEl: HTMLInputElement | null;
 *     treeEl: HTMLElement | null;
 *     menuBarEl: HTMLElement | null;
 *   });
 *   overlayRefs: {
 *     dropdownEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *   } | (() => {
 *     dropdownEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *   });
 *   handlers: Record<string, any> | (() => Record<string, any>);
 *   actions: {
 *     setStatusMessage: (value: string) => void;
 *     showError: (err: unknown) => void;
 *     loadDir: (path: string) => Promise<void>;
 *     scheduleUiSave: () => void;
 *     saveUiStateNow: () => Promise<void>;
 *     recomputeStatusItems: () => void;
 *   };
 *   deps: {
 *     homeDir: () => Promise<string>;
 *     invoke: (command: string, args?: Record<string, any>) => Promise<any>;
 *     listen: (event: string, handler: (event: any) => void) => Promise<() => void>;
 *     EVENT_FS_CHANGED: string;
 *     EVENT_OP_PROGRESS: string;
 *     getCurrentWindow: () => any;
 *     t: (key: string, params?: Record<string, string | number>) => string;
 *   };
 *   stateGet: {
 *     watchRefreshTimer: () => ReturnType<typeof setTimeout> | null;
 *     updateWindowBounds: () => () => Promise<void>;
 *   };
 *   stateSet: {
 *     watchRefreshTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *     updateWindowBounds: (value: () => Promise<void>) => void;
 *   };
 *   helpers: object | (() => object);
 *   constants: { KEYMAP_ACTIONS: Record<string, string> };
 * }} params
 */
export function buildPageMountRuntimeInputsFromPageState(params) {
  const state = typeof params.state === "function" ? params.state() : params.state;
  const shellRefs = typeof params.shellRefs === "function" ? params.shellRefs() : params.shellRefs;
  const overlayRefs =
    typeof params.overlayRefs === "function" ? params.overlayRefs() : params.overlayRefs;

  return buildPageMountRuntimeInputsFromState({
    state,
    shellRefs,
    overlayRefs,
    handlers: params.handlers,
    deps: {
      homeDir: params.deps.homeDir,
      invoke: params.deps.invoke,
      listen: params.deps.listen,
      EVENT_FS_CHANGED: params.deps.EVENT_FS_CHANGED,
      EVENT_OP_PROGRESS: params.deps.EVENT_OP_PROGRESS,
      setStatusMessage: params.actions.setStatusMessage,
      showError: params.actions.showError,
      loadDir: params.actions.loadDir,
      recomputeStatusItems: params.actions.recomputeStatusItems,
      getCurrentWindow: params.deps.getCurrentWindow,
      scheduleUiSave: () => params.actions.scheduleUiSave(),
      t: params.deps.t,
    },
    stateGet: params.stateGet,
    stateSet: params.stateSet,
    helpers: params.helpers,
    constants: params.constants,
    saveUiStateNow: params.actions.saveUiStateNow,
  });
}
