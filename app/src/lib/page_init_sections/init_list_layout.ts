import { ListLayoutSectionParams } from "./types";

/**
 * @param {ListLayoutSectionParams} params
 */
export function initListLayoutSection(params: ListLayoutSectionParams) {
  const { createListLayoutHelpers } = params;
  const {
    updateListRows,
    updateOverflowMarkers,
    updateVisibleColumns,
    setScrollStartColumn,
    ensureColumnVisible,
    scrollListHorizontallyByColumns,
    getActualColumnSpan,
  } = createListLayoutHelpers({
    getListEl: params.getListEl,
    getListBodyEl: params.getListBodyEl,
    getListCols: params.getListCols,
    getListRows: params.getListRows,
    getVisibleColStart: params.getVisibleColStart,
    getVisibleColEnd: params.getVisibleColEnd,
    getFilteredCount: params.getFilteredCount,
    getShowSize: params.getShowSize,
    getShowTime: params.getShowTime,
    setListRows: params.setListRows,
    setListCols: params.setListCols,
    setNameMaxChars: params.setNameMaxChars,
    setVisibleColStart: params.setVisibleColStart,
    setVisibleColEnd: params.setVisibleColEnd,
    setOverflowLeft: params.setOverflowLeft,
    setOverflowRight: params.setOverflowRight,
  });
  params.setUpdateListRows(updateListRows);
  params.setUpdateOverflowMarkers(updateOverflowMarkers);
  params.setUpdateVisibleColumns(updateVisibleColumns);
  params.setSetScrollStartColumn(setScrollStartColumn);
  params.setEnsureColumnVisible(ensureColumnVisible);
  params.setScrollListHorizontallyByColumns(scrollListHorizontallyByColumns);
  params.setGetActualColumnSpan(getActualColumnSpan);
  params.markReady("updateListRows");
  params.markReady("updateOverflowMarkers");
  params.markReady("updateVisibleColumns");
  params.markReady("setScrollStartColumn");
  params.markReady("ensureColumnVisible");
  params.markReady("scrollListHorizontallyByColumns");
  params.markReady("getActualColumnSpan");
}
