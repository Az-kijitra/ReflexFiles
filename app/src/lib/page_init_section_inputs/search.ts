import { computeSearchEffect } from "../page_effects";
import { createSearchHelpers } from "../page_search";
import { applySearchFilter } from "../utils/history";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildSearchSectionInputs(params, markReady) {
  return {
    createSearchHelpers,
    computeSearchEffect,
    applySearchFilter,
    getEntries: params.state.getEntries,
    getSearchActive: params.state.getSearchActive,
    getSearchQuery: params.state.getSearchQuery,
    getSearchRegex: params.state.getSearchRegex,
    setFilteredEntries: params.set.setFilteredEntries,
    setSearchError: params.set.setSearchError,
    t: params.values.t,
    setRecomputeSearch: params.set.setRecomputeSearch,
    markReady,
  };
}
