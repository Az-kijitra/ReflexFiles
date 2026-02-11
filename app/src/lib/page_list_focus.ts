import { getNextIndexByColumn, getNextIndexByRow } from "$lib/utils/navigation";

/**
 * @param {object} params
 * @param {() => import("$lib/types").Entry[]} params.getEntries
 * @param {() => import("$lib/types").Entry[]} params.getFilteredEntries
 * @param {() => number} params.getFocusedIndex
 * @param {() => number | null} params.getAnchorIndex
 * @param {() => number} params.getListRows
 * @param {(index: number) => void} params.setFocusedIndex
 * @param {(from: number, to: number) => void} params.selectRange
 * @param {(targetCol: number, rowsOverride?: number | null) => void} params.ensureColumnVisible
 */
export function createListFocusMovers({
  getEntries,
  getFilteredEntries,
  getFocusedIndex,
  getAnchorIndex,
  getListRows,
  setFocusedIndex,
  selectRange,
  ensureColumnVisible,
}) {
  /**
   * @param {number} delta
   * @param {boolean} useRange
   */
  function moveFocusByRow(delta, useRange) {
    const next = getNextIndexByRow({
      entries: getEntries(),
      filteredEntries: getFilteredEntries(),
      focusedIndex: getFocusedIndex(),
      delta,
    });
    if (!next) return;
    if (useRange) {
      selectRange(getAnchorIndex() ?? getFocusedIndex(), next.targetIndex);
    } else {
      setFocusedIndex(next.targetIndex);
    }
    const step = Math.max(1, getListRows());
    const nextCol = Math.floor(next.targetVisual / step);
    ensureColumnVisible(nextCol, step);
  }

  /**
   * @param {number} offsetColumns
   * @param {boolean} useRange
   */
  function moveFocusByColumn(offsetColumns, useRange) {
    const step = Math.max(1, getListRows());
    const next = getNextIndexByColumn({
      entries: getEntries(),
      filteredEntries: getFilteredEntries(),
      focusedIndex: getFocusedIndex(),
      offsetColumns,
      rowsPerColumn: step,
    });
    if (!next) return;
    if (useRange) {
      selectRange(getAnchorIndex() ?? getFocusedIndex(), next.targetIndex);
    } else {
      setFocusedIndex(next.targetIndex);
    }
    ensureColumnVisible(next.targetCol, step);
  }

  return { moveFocusByRow, moveFocusByColumn };
}
