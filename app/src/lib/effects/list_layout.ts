/**
 * @param {HTMLElement | null} listBodyEl
 * @param {() => void} updateOverflowMarkers
 * @param {() => void} updateVisibleColumns
 */
import { LIST_COL_FALLBACK_PX, LIST_COL_GAP_PX } from "$lib/ui_layout";

export function updateListColumnsOnBodyChange(listBodyEl, updateOverflowMarkers, updateVisibleColumns) {
  if (!listBodyEl) return;
  updateOverflowMarkers();
  updateVisibleColumns();
}

/**
 * @param {HTMLElement | null} listBodyEl
 * @param {HTMLElement | null} listEl
 * @param {() => void} updateListRows
 * @param {() => void} updateOverflowMarkers
 * @param {() => void} updateVisibleColumns
 * @param {(element: HTMLElement | null) => number | null} getActualColumnSpan
 */
export function setupListLayoutObserver(
  listBodyEl,
  listEl,
  updateListRows,
  updateOverflowMarkers,
  updateVisibleColumns,
  getActualColumnSpan
) {
  if (!listBodyEl) return null;
  const observer = new ResizeObserver(() => {
    updateListRows();
    updateOverflowMarkers();
    updateVisibleColumns();
  });
  let snapTimer = null;
  /** @type {EventListener} */
  const onScroll = () => {
    if (!listBodyEl) return;
    const styles = getComputedStyle(document.documentElement);
    const fallbackColWidth =
      Number.parseInt(styles.getPropertyValue("--list-col-width"), 10) || LIST_COL_FALLBACK_PX;
    const colGap =
      Number.parseInt(styles.getPropertyValue("--list-col-gap"), 10) || LIST_COL_GAP_PX;
    const span = getActualColumnSpan(listBodyEl) ?? (fallbackColWidth + colGap);
    if (snapTimer) {
      cancelAnimationFrame(snapTimer);
    }
    snapTimer = requestAnimationFrame(() => {
      if (!listBodyEl) return;
      const snapped = Math.round(listBodyEl.scrollLeft / span) * span;
      if (Math.abs(listBodyEl.scrollLeft - snapped) > 1) {
        listBodyEl.scrollLeft = snapped;
      }
      updateOverflowMarkers();
      updateVisibleColumns();
    });
  };
  observer.observe(listBodyEl);
  if (listEl) {
    observer.observe(listEl);
  }
  listBodyEl.addEventListener("scroll", onScroll);
  updateListRows();
  updateOverflowMarkers();
  updateVisibleColumns();
  return () => {
    observer.disconnect();
    listBodyEl.removeEventListener("scroll", onScroll);
    if (snapTimer) {
      cancelAnimationFrame(snapTimer);
    }
  };
}
