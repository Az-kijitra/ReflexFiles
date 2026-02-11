/**
 * @param {{
 *   state: {
 *     getDropdownEl: () => HTMLElement | null;
 *     getJumpList: () => unknown[];
 *     getPathHistory: () => string[];
 *     getCurrentPath: () => string;
 *     getShowHidden: () => boolean;
 *     getShowError: () => (err: unknown) => void;
 *   };
 *   actions: {
 *     setDropdownMode: (value: "history" | "jump") => void;
 *     setDropdownOpen: (value: boolean) => void;
 *     setPathInput: (value: string) => void;
 *     getSetStatusMessage: () => (message: string, timeoutMs?: number) => void;
 *   };
 *   deps: {
 *     t: (key: string, params?: Record<string, string | number>) => string;
 *     tick: typeof import("svelte").tick;
 *     invoke: typeof import("@tauri-apps/api/core").invoke;
 *     treeNodeName: (node: unknown) => string;
 *   };
 * }} params
 */
export function buildJumpHandlersSetupInputs(params) {
  return {
    setDropdownMode: params.actions.setDropdownMode,
    setDropdownOpen: params.actions.setDropdownOpen,
    getDropdownEl: params.state.getDropdownEl,
    getJumpList: params.state.getJumpList,
    getPathHistory: params.state.getPathHistory,
    getSetStatusMessage: params.actions.getSetStatusMessage,
    t: params.deps.t,
    tick: params.deps.tick,
    getCurrentPath: params.state.getCurrentPath,
    invoke: params.deps.invoke,
    getShowHidden: params.state.getShowHidden,
    setPathInput: params.actions.setPathInput,
    getShowError: params.state.getShowError,
    treeNodeName: params.deps.treeNodeName,
  };
}
