import { buildListFocusMoversInputsFromVars } from "./page_list_focus_inputs_from_vars";

/**
 * @param {{
 *   state: any;
 *   actions: {
 *     setFocusedIndex: (value: number) => void;
 *     selectRange: (from: number, to: number) => void;
 *     ensureColumnVisible: (targetCol: number, rowsOverride?: number | null) => void;
 *   };
 * }} params
 */
export function buildListFocusMoversInputsFromState(params) {
  return buildListFocusMoversInputsFromVars({
    state: () => ({
      entries: params.state.entries,
      filteredEntries: params.state.filteredEntries,
      focusedIndex: params.state.focusedIndex,
      anchorIndex: params.state.anchorIndex,
      listRows: params.state.listRows,
    }),
    actions: params.actions,
  });
}
