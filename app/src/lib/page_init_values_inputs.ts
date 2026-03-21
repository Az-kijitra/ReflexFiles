// ── Types ─────────────────────────────────────────────────────────────────────

export interface PageInitValuesInputsParams {
  t:              (key: string, params?: Record<string, string | number>) => string;
  matchesAction:  (action: string, key: string) => boolean;
  showError:      (err: unknown) => void;
  clearTree:      () => void;
  loadCurrentDir: () => Promise<void>;
  selectedCount:  () => number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dropdownItemsSafe: () => any[];
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildPageInitValuesInputs(params: PageInitValuesInputsParams) {
  return {
    t:                   params.t,
    matchesAction:       params.matchesAction,
    showError:           params.showError,
    clearTree:           params.clearTree,
    loadCurrentDir:      params.loadCurrentDir,
    getSelectedCount:    params.selectedCount,
    getDropdownItemsSafe:params.dropdownItemsSafe,
  };
}
