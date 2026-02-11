import { SortMenuSectionParams } from "./types";

/**
 * @param {SortMenuSectionParams} params
 */
export function initSortMenuSection(params: SortMenuSectionParams) {
  const { createSortMenuHelpers } = params;
  const { setSort, openSortMenu, closeSortMenu, handleSortMenuKey } = createSortMenuHelpers({
    getSortMenuOpen: params.getSortMenuOpen,
    setSortMenuOpen: params.setSortMenuOpen,
    getSortMenuIndex: params.getSortMenuIndex,
    setSortMenuIndex: params.setSortMenuIndex,
    getSortKey: params.getSortKey,
    setSortKey: params.setSortKey,
    getSortOrder: params.getSortOrder,
    setSortOrder: params.setSortOrder,
    getSortMenuEl: params.getSortMenuEl,
    trapModalTab: params.trapModalTab,
    scheduleUiSave: params.getScheduleUiSave(),
    loadCurrentDir: params.loadCurrentDir,
    tick: params.tick,
  });
  params.setSetSort(setSort);
  params.setOpenSortMenu(openSortMenu);
  params.setCloseSortMenu(closeSortMenu);
  params.setHandleSortMenuKey(handleSortMenuKey);
  params.markReady("setSort");
  params.markReady("openSortMenu");
  params.markReady("closeSortMenu");
  params.markReady("handleSortMenuKey");
}
