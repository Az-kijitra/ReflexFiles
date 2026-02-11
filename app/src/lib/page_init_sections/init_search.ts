import { SearchSectionParams } from "./types";

/**
 * @param {SearchSectionParams} params
 */
export function initSearchSection(params: SearchSectionParams) {
  const { createSearchHelpers } = params;
  const { recomputeSearch } = createSearchHelpers({
    computeSearchEffect: params.computeSearchEffect,
    applySearchFilter: params.applySearchFilter,
    getEntries: params.getEntries,
    getSearchActive: params.getSearchActive,
    getSearchQuery: params.getSearchQuery,
    getSearchRegex: params.getSearchRegex,
    setFilteredEntries: params.setFilteredEntries,
    setSearchError: params.setSearchError,
    t: params.t,
  });
  params.setRecomputeSearch(recomputeSearch);
  params.markReady("recomputeSearch");
}
