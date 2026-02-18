import {
  computeListLayout,
  computeOverflowMarkers,
  computeVisibleColumns,
  ensureColumnVisible as ensureColumnVisibleLayout,
  getActualColumnSpan,
  setScrollStartColumn as setScrollStartColumnLayout,
} from "$lib/utils/list_layout";

/**
 * @param {object} params
 * @param {() => HTMLElement | null} params.getListEl
 * @param {() => HTMLElement | null} params.getListBodyEl
 * @param {() => number} params.getListCols
 * @param {() => number} params.getListRows
 * @param {() => number} params.getVisibleColStart
 * @param {() => number} params.getVisibleColEnd
 * @param {() => number} params.getFilteredCount
 * @param {() => boolean} params.getShowSize
 * @param {() => boolean} params.getShowTime
 * @param {(value: number) => void} params.setListRows
 * @param {(value: number) => void} params.setListCols
 * @param {(value: number) => void} params.setNameMaxChars
 * @param {(value: number) => void} params.setVisibleColStart
 * @param {(value: number) => void} params.setVisibleColEnd
 * @param {(value: boolean) => void} params.setOverflowLeft
 * @param {(value: boolean) => void} params.setOverflowRight
 */
export function createListLayoutHelpers(params) {
  const {
    getListEl,
    getListBodyEl,
    getListCols,
    getListRows,
    getVisibleColStart,
    getVisibleColEnd,
    getFilteredCount,
    getShowSize,
    getShowTime,
    setListRows,
    setListCols,
    setNameMaxChars,
    setVisibleColStart,
    setVisibleColEnd,
    setOverflowLeft,
    setOverflowRight,
  } = params;

  function updateOverflowMarkers() {
    const listBodyEl = getListBodyEl();
    if (!listBodyEl) return;
    const result = computeOverflowMarkers({
      filteredCount: getFilteredCount(),
      listRows: getListRows(),
      visibleColStart: getVisibleColStart(),
      visibleColEnd: getVisibleColEnd(),
    });
    setOverflowLeft(result.overflowLeft);
    setOverflowRight(result.overflowRight);
  }

  function updateVisibleColumns() {
    const listBodyEl = getListBodyEl();
    if (!listBodyEl) return;
    const result = computeVisibleColumns({
      listBodyEl,
      listEl: getListEl(),
      listCols: getListCols(),
    });
    if (!result) return;
    setVisibleColStart(result.visibleColStart);
    setVisibleColEnd(result.visibleColEnd);
  }

  function updateListRows() {
    const listBodyEl = getListBodyEl();
    if (!listBodyEl) return;
    updateOverflowMarkers();
    updateVisibleColumns();
    const result = computeListLayout({
      listBodyEl,
      listEl: getListEl(),
      filteredCount: getFilteredCount(),
      showSize: getShowSize(),
      showTime: getShowTime(),
    });
    if (!result) return;
    setListRows(result.rows);
    setListCols(result.cols);
    setNameMaxChars(result.nameMaxChars);
  }

  /**
   * @param {number} startCol
   * @param {number | null} rowsOverride
   */
  function setScrollStartColumn(startCol, rowsOverride) {
    const result = setScrollStartColumnLayout({
      listBodyEl: getListBodyEl(),
      listEl: getListEl(),
      listCols: getListCols(),
      listRows: getListRows(),
      filteredCount: getFilteredCount(),
      startCol,
      rowsOverride,
    });
    if (!result) return;
    setVisibleColStart(result.visibleColStart);
    setVisibleColEnd(result.visibleColEnd);
    setOverflowLeft(result.overflowLeft);
    setOverflowRight(result.overflowRight);
  }

  /**
   * @param {number} targetCol
   * @param {number | null} rowsOverride
   */
  function ensureColumnVisible(targetCol, rowsOverride) {
    const result = ensureColumnVisibleLayout({
      listBodyEl: getListBodyEl(),
      listEl: getListEl(),
      listCols: getListCols(),
      listRows: getListRows(),
      filteredCount: getFilteredCount(),
      targetCol,
      rowsOverride,
    });
    if (!result) return;
    setVisibleColStart(result.visibleColStart);
    setVisibleColEnd(result.visibleColEnd);
    setOverflowLeft(result.overflowLeft);
    setOverflowRight(result.overflowRight);
  }

  /**
   * @param {number} deltaColumns
   */
  function scrollListHorizontallyByColumns(deltaColumns) {
    const listBodyEl = getListBodyEl();
    if (!listBodyEl) return;
    setScrollStartColumn(getVisibleColStart() + deltaColumns, null);
  }

  return {
    updateListRows,
    updateOverflowMarkers,
    updateVisibleColumns,
    setScrollStartColumn,
    ensureColumnVisible,
    scrollListHorizontallyByColumns,
    getActualColumnSpan,
  };
}
