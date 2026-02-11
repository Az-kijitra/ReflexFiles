/**
 * @param {{
 *   state: any;
 *   shellRefs: {
 *     listEl: HTMLElement | null;
 *     pathInputEl: HTMLInputElement | null;
 *     treeEl: HTMLElement | null;
 *     menuBarEl: HTMLElement | null;
 *   };
 *   overlayRefs: {
 *     dropdownEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *   };
 *   handlers: Record<string, any> | (() => Record<string, any>);
 *   deps: {
 *     homeDir: () => Promise<string>;
 *     invoke: (command: string, args?: Record<string, any>) => Promise<any>;
 *     listen: (event: string, handler: (event: any) => void) => Promise<() => void>;
 *     EVENT_FS_CHANGED: string;
 *     EVENT_OP_PROGRESS: string;
 *     setStatusMessage: (value: string) => void;
 *     showError: (err: unknown) => void;
 *     loadDir: (path: string) => Promise<void>;
 *     recomputeStatusItems: () => void;
 *     getCurrentWindow: () => any;
 *     scheduleUiSave: () => void;
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
 *   saveUiStateNow: () => Promise<void>;
 * }} params
 */
export function buildPageMountRuntimeInputsFromState(params) {
  return {
    deps: params.deps,
    state: {
      state: params.state,
      get: params.stateGet,
      set: params.stateSet,
    },
    domHandlers: {
      state: params.state,
      refs: () => ({
        listEl: params.shellRefs.listEl,
        pathInputEl: params.shellRefs.pathInputEl,
        treeEl: params.shellRefs.treeEl,
        dropdownEl: params.overlayRefs.dropdownEl,
        contextMenuEl: params.overlayRefs.contextMenuEl,
        menuBarEl: params.shellRefs.menuBarEl,
      }),
      handlers: params.handlers,
      helpers: params.helpers,
      constants: params.constants,
    },
    saveUiStateNow: params.saveUiStateNow,
  };
}
