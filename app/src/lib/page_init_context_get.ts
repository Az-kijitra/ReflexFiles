/**
 * @param {{
 *   timers: {
 *     uiSaveTimer: () => ReturnType<typeof setTimeout> | null;
 *     watchTimer: () => ReturnType<typeof setTimeout> | null;
 *   };
 *   actions: {
 *     loadDir: () => (path: string) => Promise<void>;
 *     focusList: () => () => void;
 *     buildTreeRoot: () => (path: string) => Promise<void>;
 *     updateListRows: () => () => void;
 *     scheduleUiSave: () => () => void;
 *     scheduleWatch: () => (path: string) => void;
 *   };
 * }} params
 */
export function buildInitPageGet(params) {
  return {
    uiSaveTimer: params.timers.uiSaveTimer,
    watchTimer: params.timers.watchTimer,
    loadDir: params.actions.loadDir,
    focusList: params.actions.focusList,
    buildTreeRoot: params.actions.buildTreeRoot,
    updateListRows: params.actions.updateListRows,
    scheduleUiSave: params.actions.scheduleUiSave,
    scheduleWatch: params.actions.scheduleWatch,
  };
}
