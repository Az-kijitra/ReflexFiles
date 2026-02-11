/**
 * @param {{
 *   scheduleUiSave: () => void;
 *   getLoadDir: () => (path: string) => Promise<void>;
 *   getMoveFocusByRow: () => (delta: number, useRange: boolean) => void;
 *   undoLimit: number;
 *   zipPasswordMaxAttempts: number;
 * }} params
 */
export function buildPageActionsDeps(params) {
  return {
    scheduleUiSave: params.scheduleUiSave,
    loadDir: (path) => params.getLoadDir()(path),
    moveFocusByRow: (delta, useRange) =>
      params.getMoveFocusByRow()(delta, useRange),
    undoLimit: params.undoLimit,
    zipPasswordMaxAttempts: params.zipPasswordMaxAttempts,
  };
}
