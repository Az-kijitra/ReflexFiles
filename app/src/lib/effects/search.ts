/**
 * @param {import("$lib/types").Entry[]} entries
 * @param {object} params
 * @param {boolean} params.searchActive
 * @param {string} params.searchQuery
 * @param {boolean} params.searchRegex
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(entries: import("$lib/types").Entry[], params: { searchActive: boolean, searchQuery: string, searchRegex: boolean, t: (key: string, vars?: Record<string, string | number>) => string }) => { filteredEntries: import("$lib/types").Entry[], searchError: string }} params.applySearchFilter
 */
export function computeSearchEffect(entries, params) {
  return params.applySearchFilter(entries, {
    searchActive: params.searchActive,
    searchQuery: params.searchQuery,
    searchRegex: params.searchRegex,
    t: params.t,
  });
}
