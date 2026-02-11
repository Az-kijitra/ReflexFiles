import { buildPageMountDepsFromVars } from "./page_mount_deps_from_vars";
import { buildPageMountDomHandlersInputsFromState } from "./page_mount_dom_handlers_inputs_from_state";
import { buildPageMountInputsFromVars } from "./page_mount_inputs_from_vars";
import { buildPageMountStateFromState } from "./page_mount_state_from_state";

/**
 * @param {{
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
 *   state: Parameters<typeof buildPageMountStateFromState>[0];
 *   domHandlers: Parameters<typeof buildPageMountDomHandlersInputsFromState>[0];
 *   saveUiStateNow: () => Promise<void>;
 * }} params
 */
export function buildPageMountInputsFromState(params) {
  return buildPageMountInputsFromVars({
    deps: buildPageMountDepsFromVars({
      homeDir: params.deps.homeDir,
      invoke: params.deps.invoke,
      listen: params.deps.listen,
      EVENT_FS_CHANGED: params.deps.EVENT_FS_CHANGED,
      EVENT_OP_PROGRESS: params.deps.EVENT_OP_PROGRESS,
      setStatusMessage: params.deps.setStatusMessage,
      showError: params.deps.showError,
      loadDir: params.deps.loadDir,
      recomputeStatusItems: params.deps.recomputeStatusItems,
      getCurrentWindow: params.deps.getCurrentWindow,
      scheduleUiSave: () => params.deps.scheduleUiSave(),
      t: params.deps.t,
    }),
    state: buildPageMountStateFromState(params.state),
    domHandlers: buildPageMountDomHandlersInputsFromState(params.domHandlers),
    saveUiStateNow: params.saveUiStateNow,
  });
}
