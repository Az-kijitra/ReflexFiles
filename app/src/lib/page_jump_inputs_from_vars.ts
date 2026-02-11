import { buildJumpHandlersSetupInputs } from "./page_jump_inputs";

/**
 * @param {{
 *   state: (() => {
 *     dropdownEl: HTMLElement | null;
 *     jumpList: unknown[];
 *     pathHistory: string[];
 *     currentPath: string;
 *     showHidden: boolean;
 *     showError: (err: unknown) => void;
 *   }) | {
 *     dropdownEl: HTMLElement | null;
 *     jumpList: unknown[];
 *     pathHistory: string[];
 *     currentPath: string;
 *     showHidden: boolean;
 *     showError: (err: unknown) => void;
 *   };
 *   actions: (() => {
 *     setDropdownMode: (value: "history" | "jump") => void;
 *     setDropdownOpen: (value: boolean) => void;
 *     setPathInput: (value: string) => void;
 *     setStatusMessage: (message: string, timeoutMs?: number) => void;
 *   }) | {
 *     setDropdownMode: (value: "history" | "jump") => void;
 *     setDropdownOpen: (value: boolean) => void;
 *     setPathInput: (value: string) => void;
 *     setStatusMessage: (message: string, timeoutMs?: number) => void;
 *   };
 *   deps: {
 *     t: (key: string, params?: Record<string, string | number>) => string;
 *     tick: typeof import("svelte").tick;
 *     invoke: typeof import("@tauri-apps/api/core").invoke;
 *     treeNodeName: (node: unknown) => string;
 *   };
 * }} params
 */
export function buildJumpHandlersSetupInputsFromVars(params) {
  const getState = typeof params.state === "function" ? params.state : () => params.state;
  const getActions = typeof params.actions === "function" ? params.actions : () => params.actions;

  return buildJumpHandlersSetupInputs({
    state: {
      getDropdownEl: () => getState().dropdownEl,
      getJumpList: () => getState().jumpList,
      getPathHistory: () => getState().pathHistory,
      getCurrentPath: () => getState().currentPath,
      getShowHidden: () => getState().showHidden,
      getShowError: () => getState().showError,
    },
    actions: {
      setDropdownMode: (value) => getActions().setDropdownMode(value),
      setDropdownOpen: (value) => getActions().setDropdownOpen(value),
      setPathInput: (value) => getActions().setPathInput(value),
      getSetStatusMessage: () => getActions().setStatusMessage,
    },
    deps: params.deps,
  });
}
