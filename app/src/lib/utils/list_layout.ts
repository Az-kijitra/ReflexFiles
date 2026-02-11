function getCssIntVar(name, fallback) {
  const styles = getComputedStyle(document.documentElement);
  const value = Number.parseInt(styles.getPropertyValue(name), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * @param {HTMLElement | null} listBodyEl
 */
export function getActualColumnSpan(listBodyEl) {
  if (!listBodyEl) return null;
  const row = listBodyEl.querySelector(".row");
  if (!row) return null;
  const rowRect = row.getBoundingClientRect();
  if (rowRect.width <= 0) return null;
  const colGap = getCssIntVar("--list-col-gap", 16);
  return rowRect.width + colGap;
}

/**
 * @param {object} args
 * @param {HTMLElement | null} args.listBodyEl
 * @param {HTMLElement | null} args.listEl
 * @param {number} args.filteredCount
 * @param {boolean} args.showSize
 * @param {boolean} args.showTime
 */
export function computeListLayout({
  listBodyEl,
  listEl,
  filteredCount,
  showSize,
  showTime,
}) {
  if (!listBodyEl) return null;
  const rowHeight = getCssIntVar("--list-row-height", 32);
  const height = listBodyEl.clientHeight;
  const rows = Math.max(1, Math.floor(height / rowHeight));
  listBodyEl.style.setProperty("--list-rows", String(rows));
  const nameMin = 140;
  const sizeWidth = 72;
  const timeWidth = 140;
  const innerGap = 8;
  const padding = 32;
  const columns = 1 + (showSize ? 1 : 0) + (showTime ? 1 : 0);
  const minCol =
    nameMin +
    (showSize ? sizeWidth : 0) +
    (showTime ? timeWidth : 0) +
    innerGap * Math.max(0, columns - 1) +
    padding;
  const maxCol = 720;
  const colGap = 16;
  const baseWidth = listEl ? listEl.clientWidth : listBodyEl.clientWidth;
  const maxFitCols = Math.max(1, Math.floor((baseWidth + colGap) / (minCol + colGap)));
  const requiredCols = Math.max(1, Math.ceil(filteredCount / rows));
  const cols = Math.min(maxFitCols, requiredCols);
  const available = baseWidth - Math.max(0, cols - 1) * colGap;
  const rawWidth = Math.floor(available / cols);
  const colWidth =
    requiredCols > maxFitCols ? minCol : Math.max(minCol, Math.min(maxCol, rawWidth));
  const width = cols * colWidth + Math.max(0, cols - 1) * colGap;
  listBodyEl.style.width = `${width}px`;
  listBodyEl.style.setProperty("--list-cols", String(cols));
  listBodyEl.style.setProperty("--list-col-width", `${colWidth}px`);
  listBodyEl.style.setProperty("--list-col-gap", `${colGap}px`);
  const iconReserve = 12;
  const nameCellWidth =
    colWidth -
    (showSize ? sizeWidth : 0) -
    (showTime ? timeWidth : 0) -
    innerGap * Math.max(0, columns - 1) -
    padding;
  const monoCharWidth = 6;
  const nameMaxChars = Math.max(
    8,
    Math.floor((nameCellWidth - iconReserve) / monoCharWidth) + 4
  );
  return { rows, cols, nameMaxChars };
}

/**
 * @param {object} args
 * @param {HTMLElement | null} args.listBodyEl
 * @param {HTMLElement | null} args.listEl
 * @param {number} args.listCols
 */
export function computeVisibleColumns({ listBodyEl, listEl, listCols }) {
  if (!listBodyEl) return null;
  const fallbackColWidth = getCssIntVar("--list-col-width", 240);
  const colGap = getCssIntVar("--list-col-gap", 16);
  const span = getActualColumnSpan(listBodyEl) ?? (fallbackColWidth + colGap);
  const start = Math.round(listBodyEl.scrollLeft / span);
  const visibleCols = listEl
    ? Math.max(1, Math.floor((listEl.clientWidth + colGap) / span))
    : listCols;
  return { visibleColStart: start, visibleColEnd: start + Math.max(0, visibleCols - 1) };
}

/**
 * @param {object} args
 * @param {number} args.filteredCount
 * @param {number} args.listRows
 * @param {number} args.visibleColStart
 * @param {number} args.visibleColEnd
 */
export function computeOverflowMarkers({
  filteredCount,
  listRows,
  visibleColStart,
  visibleColEnd,
}) {
  const totalCols = Math.max(1, Math.ceil(filteredCount / Math.max(1, listRows)));
  return {
    overflowLeft: visibleColStart > 0,
    overflowRight: visibleColEnd < totalCols - 1,
  };
}

/**
 * @param {object} args
 * @param {HTMLElement | null} args.listBodyEl
 * @param {HTMLElement | null} args.listEl
 * @param {number} args.listCols
 * @param {number} args.listRows
 * @param {number} args.filteredCount
 * @param {number} args.startCol
 * @param {number | null} args.rowsOverride
 */
export function setScrollStartColumn({
  listBodyEl,
  listEl,
  listCols,
  listRows,
  filteredCount,
  startCol,
  rowsOverride,
}) {
  if (!listBodyEl) return null;
  const fallbackColWidth = getCssIntVar("--list-col-width", 240);
  const colGap = getCssIntVar("--list-col-gap", 16);
  const span = getActualColumnSpan(listBodyEl) ?? (fallbackColWidth + colGap);
  const rows = Math.max(1, rowsOverride ?? listRows);
  const totalCols = Math.max(1, Math.ceil(filteredCount / rows));
  const maxStart = Math.max(0, totalCols - Math.max(1, listCols));
  const clamped = Math.min(Math.max(startCol, 0), maxStart);
  listBodyEl.scrollLeft = Math.round(clamped * span);
  const visible = computeVisibleColumns({ listBodyEl, listEl, listCols });
  if (!visible) return null;
  const overflow = computeOverflowMarkers({
    filteredCount,
    listRows: rows,
    visibleColStart: visible.visibleColStart,
    visibleColEnd: visible.visibleColEnd,
  });
  return { ...visible, ...overflow };
}

/**
 * @param {object} args
 * @param {HTMLElement | null} args.listBodyEl
 * @param {HTMLElement | null} args.listEl
 * @param {number} args.listCols
 * @param {number} args.listRows
 * @param {number} args.filteredCount
 * @param {number} args.targetCol
 * @param {number | null} args.rowsOverride
 */
export function ensureColumnVisible({
  listBodyEl,
  listEl,
  listCols,
  listRows,
  filteredCount,
  targetCol,
  rowsOverride,
}) {
  if (!listBodyEl) return null;
  const fallbackColWidth = getCssIntVar("--list-col-width", 240);
  const colGap = getCssIntVar("--list-col-gap", 16);
  const span = getActualColumnSpan(listBodyEl) ?? (fallbackColWidth + colGap);
  const start = Math.round(listBodyEl.scrollLeft / span);
  const visibleCols = listEl
    ? Math.max(1, Math.floor((listEl.clientWidth + colGap) / span))
    : Math.max(1, listCols);
  const end = start + Math.max(0, visibleCols - 1);
  if (targetCol < start) {
    return setScrollStartColumn({
      listBodyEl,
      listEl,
      listCols,
      listRows,
      filteredCount,
      startCol: targetCol,
      rowsOverride,
    });
  }
  if (targetCol > end) {
    return setScrollStartColumn({
      listBodyEl,
      listEl,
      listCols,
      listRows,
      filteredCount,
      startCol: targetCol - (visibleCols - 1),
      rowsOverride,
    });
  }
  const visible = computeVisibleColumns({ listBodyEl, listEl, listCols });
  if (!visible) return null;
  const overflow = computeOverflowMarkers({
    filteredCount,
    listRows,
    visibleColStart: visible.visibleColStart,
    visibleColEnd: visible.visibleColEnd,
  });
  return { ...visible, ...overflow };
}
