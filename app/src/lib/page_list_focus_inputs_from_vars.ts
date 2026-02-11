/**
 * @param {{
 *   state: (() => {
 *     entries: import("$lib/types").Entry[];
 *     filteredEntries: import("$lib/types").Entry[];
 *     focusedIndex: number;
 *     anchorIndex: number | null;
 *     listRows: number;
 *   }) | {
 *     entries: import("$lib/types").Entry[];
 *     filteredEntries: import("$lib/types").Entry[];
 *     focusedIndex: number;
 *     anchorIndex: number | null;
 *     listRows: number;
 *   };
 *   actions: {
 *     setFocusedIndex: (value: number) => void;
 *     selectRange: (from: number, to: number) => void;
 *     ensureColumnVisible: (targetCol: number, rowsOverride?: number | null) => void;
 *   };
 * }} params
 */
export function buildListFocusMoversInputsFromVars(params) {
  const getState = typeof params.state === "function" ? params.state : () => params.state;

  return {
    getEntries: () => getState().entries,
    getFilteredEntries: () => getState().filteredEntries,
    getFocusedIndex: () => getState().focusedIndex,
    getAnchorIndex: () => getState().anchorIndex,
    getListRows: () => getState().listRows,
    setFocusedIndex: (value) => params.actions.setFocusedIndex(value),
    selectRange: (from, to) => params.actions.selectRange(from, to),
    ensureColumnVisible: (targetCol, rowsOverride) =>
      params.actions.ensureColumnVisible(targetCol, rowsOverride),
  };
}
