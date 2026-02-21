/**
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.actions
 * @param {object} params.formatters
 * @param {object} params.helpers
 */
export function buildListViewInputs({ state, actions, formatters, helpers }) {
  return {
    currentPath: state.currentPath,
    showSize: state.showSize,
    showTime: state.showTime,
    uiFileIconMode: state.uiFileIconMode,
    loading: state.loading,
    filteredEntries: state.filteredEntries,
    entries: state.entries,
    overflowLeft: state.overflowLeft,
    overflowRight: state.overflowRight,
    visibleColStart: state.visibleColStart,
    visibleColEnd: state.visibleColEnd,
    listRows: state.listRows,
    t: helpers.t,
    selectedPaths: state.selectedPaths,
    openContextMenu: actions.openContextMenu,
    selectRange: actions.selectRange,
    toggleSelection: actions.toggleSelection,
    setSelected: actions.setSelected,
    openEntry: actions.openEntry,
    resolveGdriveWorkcopyBadge: actions.resolveGdriveWorkcopyBadge,
    formatName: formatters.formatName,
    formatSize: formatters.formatSize,
    formatModified: formatters.formatModified,
  };
}
