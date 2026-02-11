/**
 * @param {object} params
 * @param {(mode: string, jumpList: unknown[], pathHistory: string[], builder: (items: unknown[], target: string) => unknown[]) => unknown[]} params.computeDropdownItems
 * @param {(items: unknown[], target: string) => unknown[]} params.buildDropdownItems
 * @param {() => string} params.getDropdownMode
 * @param {() => unknown[]} params.getJumpList
 * @param {() => string[]} params.getPathHistory
 * @param {(value: unknown[]) => void} params.setDropdownItems
 * @param {(args: { statusMessage: string, t: (key: string, vars?: Record<string, string | number>) => string, sortKey: string, sortOrder: string, selectedCount: number, showHidden: boolean, searchActive: boolean, searchQuery: string }) => string[]} params.buildStatusItems
 * @param {() => string} params.getStatusMessage
 * @param {() => string} params.getSortKey
 * @param {() => string} params.getSortOrder
 * @param {() => number} params.getSelectedCount
 * @param {() => boolean} params.getShowHidden
 * @param {() => boolean} params.getSearchActive
 * @param {() => string} params.getSearchQuery
 * @param {(value: string[]) => void} params.setStatusItems
 * @param {(value: number, max: number) => number} params.clampDropdownIndex
 * @param {() => boolean} params.getDropdownOpen
 * @param {() => number} params.getDropdownIndex
 * @param {(value: number) => void} params.setDropdownIndex
 * @param {() => unknown[]} params.getDropdownItems
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 */
export function createDerivedEffects(params) {
  const {
    computeDropdownItems,
    buildDropdownItems,
    getDropdownMode,
    getJumpList,
    getPathHistory,
    setDropdownItems,
    buildStatusItems,
    getStatusMessage,
    getSortKey,
    getSortOrder,
    getSelectedCount,
    getShowHidden,
    getSearchActive,
    getSearchQuery,
    setStatusItems,
    clampDropdownIndex,
    getDropdownOpen,
    getDropdownIndex,
    setDropdownIndex,
    getDropdownItems,
    t,
  } = params;

  function recomputeDropdownItems() {
    setDropdownItems(
      computeDropdownItems(
        getDropdownMode(),
        getJumpList(),
        getPathHistory(),
        buildDropdownItems
      )
    );
  }

  function recomputeStatusItems() {
    setStatusItems(
      buildStatusItems({
        statusMessage: getStatusMessage(),
        t,
        sortKey: getSortKey(),
        sortOrder: getSortOrder(),
        selectedCount: getSelectedCount(),
        showHidden: getShowHidden(),
        searchActive: getSearchActive(),
        searchQuery: getSearchQuery(),
      })
    );
  }

  function clampDropdownSelection() {
    if (!getDropdownOpen()) return;
    setDropdownIndex(
      clampDropdownIndex(getDropdownIndex(), getDropdownItems().length)
    );
  }

  return {
    recomputeDropdownItems,
    recomputeStatusItems,
    clampDropdownSelection,
  };
}
