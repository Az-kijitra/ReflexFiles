import { DerivedSectionParams } from "./types";

/**
 * @param {DerivedSectionParams} params
 */
export function initDerivedSection(params: DerivedSectionParams) {
  const { createDerivedEffects } = params;
  const { recomputeDropdownItems, recomputeStatusItems, clampDropdownSelection } =
    createDerivedEffects({
      computeDropdownItems: params.computeDropdownItems,
      buildDropdownItems: params.buildDropdownItems,
      getDropdownMode: params.getDropdownMode,
      getJumpList: params.getJumpList,
      getPathHistory: params.getPathHistory,
      setDropdownItems: params.setDropdownItems,
      buildStatusItems: params.buildStatusItems,
      getStatusMessage: params.getStatusMessage,
      getSortKey: params.getSortKey,
      getSortOrder: params.getSortOrder,
      getSelectedCount: params.getSelectedCount,
      getShowHidden: params.getShowHidden,
      getSearchActive: params.getSearchActive,
      getSearchQuery: params.getSearchQuery,
      setStatusItems: params.setStatusItems,
      clampDropdownIndex: params.clampDropdownIndex,
      getDropdownOpen: params.getDropdownOpen,
      getDropdownIndex: params.getDropdownIndex,
      setDropdownIndex: params.setDropdownIndex,
      getDropdownItems: params.getDropdownItems,
      t: params.t,
    });
  params.setRecomputeDropdownItems(recomputeDropdownItems);
  params.setRecomputeStatusItems(recomputeStatusItems);
  params.setClampDropdownSelection(clampDropdownSelection);
  params.markReady("recomputeDropdownItems");
  params.markReady("recomputeStatusItems");
  params.markReady("clampDropdownSelection");
}
