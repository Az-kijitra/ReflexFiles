/**
 * @param {object} params
 * @param {(entries: unknown[], args: { searchActive: boolean, searchQuery: string, searchRegex: boolean, t: (key: string, vars?: Record<string, string | number>) => string, applySearchFilter: (entries: unknown[], query: string, regex: boolean) => unknown[] }) => { filteredEntries: unknown[], searchError: string }} params.computeSearchEffect
 * @param {(entries: unknown[], query: string, regex: boolean) => unknown[]} params.applySearchFilter
 * @param {() => unknown[]} params.getEntries
 * @param {() => boolean} params.getSearchActive
 * @param {() => string} params.getSearchQuery
 * @param {() => boolean} params.getSearchRegex
 * @param {(value: unknown[]) => void} params.setFilteredEntries
 * @param {(value: string) => void} params.setSearchError
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 */
export function createSearchHelpers(params) {
  const {
    computeSearchEffect,
    applySearchFilter,
    getEntries,
    getSearchActive,
    getSearchQuery,
    getSearchRegex,
    setFilteredEntries,
    setSearchError,
    t,
  } = params;

  function recomputeSearch() {
    const result = computeSearchEffect(getEntries(), {
      searchActive: getSearchActive(),
      searchQuery: getSearchQuery(),
      searchRegex: getSearchRegex(),
      t,
      applySearchFilter,
    });
    setFilteredEntries(result.filteredEntries);
    setSearchError(result.searchError);
  }

  return { recomputeSearch };
}
