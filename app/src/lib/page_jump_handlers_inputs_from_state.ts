import { buildJumpHandlersSetupInputsFromVars } from "./page_jump_inputs_from_vars";

/**
 * @param {{
 *   state: any;
 *   refs: {
 *     dropdownEl: HTMLElement | null;
 *   };
 *   actions: {
 *     setDropdownMode: (value: "history" | "jump") => void;
 *     setDropdownOpen: (value: boolean) => void;
 *     setPathInput: (value: string) => void;
 *     setStatusMessage: (message: string, timeoutMs?: number) => void;
 *   };
 *   showError: (err: unknown) => void;
 *   deps: {
 *     t: (key: string, params?: Record<string, string | number>) => string;
 *     tick: typeof import("svelte").tick;
 *     invoke: typeof import("@tauri-apps/api/core").invoke;
 *     treeNodeName: (node: unknown) => string;
 *   };
 * }} params
 */
export function buildJumpHandlersInputsFromState(params) {
  return buildJumpHandlersSetupInputsFromVars({
    state: () => ({
      dropdownEl: params.refs.dropdownEl,
      jumpList: params.state.jumpList,
      pathHistory: params.state.pathHistory,
      currentPath: params.state.currentPath,
      showHidden: params.state.showHidden,
      showError: params.showError,
    }),
    actions: () => ({
      setDropdownMode: params.actions.setDropdownMode,
      setDropdownOpen: params.actions.setDropdownOpen,
      setPathInput: params.actions.setPathInput,
      setStatusMessage: params.actions.setStatusMessage,
    }),
    deps: params.deps,
  });
}
