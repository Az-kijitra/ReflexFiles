import { SORT_MENU_KEYS } from "$lib/ui_constants";

/**
 * @param {object} params
 * @param {() => boolean} params.getSortMenuOpen
 * @param {(value: boolean) => void} params.setSortMenuOpen
 * @param {() => number} params.getSortMenuIndex
 * @param {(value: number) => void} params.setSortMenuIndex
 * @param {() => string} params.getSortKey
 * @param {(value: string) => void} params.setSortKey
 * @param {() => string} params.getSortOrder
 * @param {(value: string) => void} params.setSortOrder
 * @param {() => HTMLElement | null} params.getSortMenuEl
 * @param {(event: KeyboardEvent, el: HTMLElement | null) => boolean} params.trapModalTab
 * @param {() => void} params.scheduleUiSave
 * @param {() => void} params.loadCurrentDir
 * @param {() => Promise<void>} params.tick
 */
export function createSortMenuHelpers(params) {
  const {
    getSortMenuOpen,
    setSortMenuOpen,
    getSortMenuIndex,
    setSortMenuIndex,
    getSortKey,
    setSortKey,
    getSortOrder,
    setSortOrder,
    getSortMenuEl,
    trapModalTab,
    scheduleUiSave,
    loadCurrentDir,
    tick,
  } = params;

  /** @param {string} nextKey */
  function setSort(nextKey) {
    if (getSortKey() === nextKey) {
      setSortOrder(getSortOrder() === "asc" ? "desc" : "asc");
    } else {
      setSortKey(nextKey);
      setSortOrder("asc");
    }
    scheduleUiSave();
    closeSortMenu();
    loadCurrentDir();
  }

  function openSortMenu() {
    const index = SORT_MENU_KEYS.indexOf(getSortKey());
    setSortMenuIndex(index >= 0 ? index : 0);
    setSortMenuOpen(true);
    tick().then(() => {
      getSortMenuEl()?.focus({ preventScroll: true });
    });
  }

  function closeSortMenu() {
    setSortMenuOpen(false);
  }

  /** @param {KeyboardEvent} event */
  function handleSortMenuKey(event) {
    if (!getSortMenuOpen()) return;
    if (trapModalTab(event, getSortMenuEl())) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeSortMenu();
      return;
    }
    if (
      event.key === "ArrowDown" ||
      event.code === "ArrowDown" ||
      event.key === "ArrowRight" ||
      event.code === "ArrowRight"
    ) {
      event.preventDefault();
      event.stopPropagation();
      setSortMenuIndex((getSortMenuIndex() + 1) % SORT_MENU_KEYS.length);
      return;
    }
    if (
      event.key === "ArrowUp" ||
      event.code === "ArrowUp" ||
      event.key === "ArrowLeft" ||
      event.code === "ArrowLeft"
    ) {
      event.preventDefault();
      event.stopPropagation();
      setSortMenuIndex(
        (getSortMenuIndex() - 1 + SORT_MENU_KEYS.length) % SORT_MENU_KEYS.length
      );
      return;
    }
    if (event.key === "Enter" || event.code === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const key = SORT_MENU_KEYS[getSortMenuIndex()];
      if (key) setSort(key);
    }
  }

  return {
    setSort,
    openSortMenu,
    closeSortMenu,
    handleSortMenuKey,
  };
}
