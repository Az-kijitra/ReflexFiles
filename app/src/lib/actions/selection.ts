/**
 * @param {object} ctx
 */
export function createSelectionActions(ctx) {
  /** @param {string} path */
  function isSelected(path) {
    return ctx.getSelectedPaths().includes(path);
  }

  /** @param {string[]} paths */
  function setSelected(paths) {
    ctx.setSelected(paths);
  }

  /**
   * @param {number} index
   * @param {boolean} [advance]
   */
  function toggleSelection(index, advance = false) {
    const next = ctx.toggleSelectionAtIndex(ctx.getEntries(), ctx.getSelectedPaths(), index);
    if (!next) return;
    ctx.setSelected(next.selectedPaths);
    ctx.setAnchorIndex(next.anchorIndex);
    ctx.setFocusedIndex(next.focusedIndex);
    if (advance) {
      ctx.moveFocusByRow(1, false);
    }
  }

  /**
   * @param {number} from
   * @param {number} to
   */
  function selectRange(from, to) {
    const next = ctx.selectRangeByIndex(ctx.getEntries(), from, to);
    ctx.setSelected(next.selectedPaths);
    ctx.setFocusedIndex(next.focusedIndex);
    ctx.setAnchorIndex(next.anchorIndex);
  }

  function selectAll() {
    const next = ctx.selectAllEntries(ctx.getEntries(), ctx.getFocusedIndex());
    ctx.setSelected(next.selectedPaths);
    ctx.setAnchorIndex(next.anchorIndex);
    ctx.setFocusedIndex(next.focusedIndex);
  }

  function clearSelection() {
    const next = ctx.clearSelectionState();
    ctx.setSelected(next.selectedPaths);
    ctx.setAnchorIndex(next.anchorIndex);
  }

  function invertSelection() {
    const next = ctx.invertSelectionPaths(ctx.getEntries(), ctx.getSelectedPaths());
    ctx.setSelected(next.selectedPaths);
    ctx.setAnchorIndex(next.anchorIndex);
  }

  return {
    isSelected,
    setSelected,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    invertSelection,
  };
}
