/**
 * @param {{
 *   state: {
 *     getDropdownEl: () => HTMLElement | null;
 *     getJumpList: () => unknown[];
 *     getPathHistory: () => string[];
 *     getCurrentPath: () => string;
 *     getShowHidden: () => boolean;
 *     getEntries: () => unknown[];
 *     getStatusMessage: () => string;
 *     getShowError: () => (err: unknown) => void;
 *   };
 *   actions: {
 *     setDropdownMode: (value: "history" | "jump") => void;
 *     setDropdownOpen: (value: boolean) => void;
 *     setPathInput: (value: string) => void;
 *     setFilteredEntries: (value: unknown[]) => void;
 *     setPathCompletionPreviewActive: (value: boolean) => void;
 *     getRecomputeSearch: () => (() => void) | null | undefined;
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
    getEntries: params.state.getEntries,
    getStatusMessage: params.state.getStatusMessage,
    setPathInput: params.actions.setPathInput,
    setFilteredEntries: params.actions.setFilteredEntries,
    setPathCompletionPreviewActive: params.actions.setPathCompletionPreviewActive,
    getRecomputeSearch: params.actions.getRecomputeSearch,
    getShowError: params.state.getShowError,
    treeNodeName: params.deps.treeNodeName,
  };
}
