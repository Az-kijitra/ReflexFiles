import { createListLayoutHelpers } from "../page_list_layout";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildListLayoutSectionInputs(params, markReady) {
  return {
    createListLayoutHelpers,
    getListEl: params.state.getListEl,
    getListBodyEl: params.state.getListBodyEl,
    getListCols: params.state.getListCols,
    getListRows: params.state.getListRows,
    getVisibleColStart: params.state.getVisibleColStart,
    getVisibleColEnd: params.state.getVisibleColEnd,
    getFilteredCount: params.state.getFilteredCount,
    getShowSize: params.state.getShowSize,
    getShowTime: params.state.getShowTime,
    setListRows: params.set.setListRows,
    setListCols: params.set.setListCols,
    setNameMaxChars: params.set.setNameMaxChars,
    setVisibleColStart: params.set.setVisibleColStart,
    setVisibleColEnd: params.set.setVisibleColEnd,
    setOverflowLeft: params.set.setOverflowLeft,
    setOverflowRight: params.set.setOverflowRight,
    setUpdateListRows: params.set.setUpdateListRows,
    setUpdateOverflowMarkers: params.set.setUpdateOverflowMarkers,
    setUpdateVisibleColumns: params.set.setUpdateVisibleColumns,
    setSetScrollStartColumn: params.set.setSetScrollStartColumn,
    setEnsureColumnVisible: params.set.setEnsureColumnVisible,
    setScrollListHorizontallyByColumns: params.set.setScrollListHorizontallyByColumns,
    setGetActualColumnSpan: params.set.setGetActualColumnSpan,
    markReady,
  };
}
