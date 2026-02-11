import { createSortMenuHelpers } from "../page_sort_menu";
import { trapModalTab } from "../page_trap";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildSortMenuSectionInputs(params, markReady) {
  return {
    createSortMenuHelpers,
    getSortMenuOpen: params.state.getSortMenuOpen,
    setSortMenuOpen: params.set.setSortMenuOpen,
    getSortMenuIndex: params.state.getSortMenuIndex,
    setSortMenuIndex: params.set.setSortMenuIndex,
    getSortKey: params.state.getSortKey,
    setSortKey: params.set.setSortKey,
    getSortOrder: params.state.getSortOrder,
    setSortOrder: params.set.setSortOrder,
    getSortMenuEl: params.state.getSortMenuEl,
    trapModalTab,
    getScheduleUiSave: params.state.getScheduleUiSave,
    loadCurrentDir: params.values.loadCurrentDir,
    tick: params.deps.tick,
    setSetSort: params.set.setSetSort,
    setOpenSortMenu: params.set.setOpenSortMenu,
    setCloseSortMenu: params.set.setCloseSortMenu,
    setHandleSortMenuKey: params.set.setHandleSortMenuKey,
    markReady,
  };
}
