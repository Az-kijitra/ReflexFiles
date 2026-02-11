/**
 * @param {{
 *   homeDir: () => Promise<string>;
 *   invoke: (command: string, payload?: Record<string, unknown>) => Promise<any>;
 *   listen: (
 *     eventName: string,
 *     handler: (event: any) => void
 *   ) => Promise<() => void>;
 *   EVENT_FS_CHANGED: string;
 *   EVENT_OP_PROGRESS: string;
 *   setStatusMessage: (message: string, durationMs?: number) => void;
 *   showError: (err: unknown) => void;
 *   loadDir: (path: string) => Promise<void>;
 *   recomputeStatusItems: () => void;
 *   getCurrentWindow: () => import("@tauri-apps/api/window").Window;
 *   scheduleUiSave: () => void;
 *   t: (key: string, vars?: Record<string, string | number>) => string;
 * }} params
 */
export function buildPageMountDepsFromVars(params) {
  return {
    homeDir: params.homeDir,
    invoke: params.invoke,
    listen: params.listen,
    EVENT_FS_CHANGED: params.EVENT_FS_CHANGED,
    EVENT_OP_PROGRESS: params.EVENT_OP_PROGRESS,
    setStatusMessage: params.setStatusMessage,
    showError: params.showError,
    loadDir: params.loadDir,
    recomputeStatusItems: params.recomputeStatusItems,
    getCurrentWindow: params.getCurrentWindow,
    scheduleUiSave: params.scheduleUiSave,
    t: params.t,
  };
}
