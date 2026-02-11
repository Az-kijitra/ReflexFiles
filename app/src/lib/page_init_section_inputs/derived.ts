import {
  buildStatusItems,
  clampDropdownIndex,
  computeDropdownItems,
} from "../page_effects";
import { createDerivedEffects } from "../page_effect_groups";
import { buildDropdownItems } from "../utils/history";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildDerivedSectionInputs(params, markReady) {
  return {
    createDerivedEffects,
    computeDropdownItems,
    buildDropdownItems,
    getDropdownMode: params.state.getDropdownMode,
    getJumpList: params.state.getJumpList,
    getPathHistory: params.state.getPathHistory,
    setDropdownItems: params.set.setDropdownItems,
    buildStatusItems,
    getStatusMessage: params.state.getStatusMessage,
    getSortKey: params.state.getSortKey,
    getSortOrder: params.state.getSortOrder,
    getSelectedCount: params.values.getSelectedCount,
    getShowHidden: params.state.getShowHidden,
    getSearchActive: params.state.getSearchActive,
    getSearchQuery: params.state.getSearchQuery,
    setStatusItems: params.set.setStatusItems,
    clampDropdownIndex,
    getDropdownOpen: params.state.getDropdownOpen,
    getDropdownIndex: params.state.getDropdownIndex,
    setDropdownIndex: params.set.setDropdownIndex,
    getDropdownItems: params.values.getDropdownItemsSafe,
    t: params.values.t,
    setRecomputeDropdownItems: params.set.setRecomputeDropdownItems,
    setRecomputeStatusItems: params.set.setRecomputeStatusItems,
    setClampDropdownSelection: params.set.setClampDropdownSelection,
    markReady,
  };
}
