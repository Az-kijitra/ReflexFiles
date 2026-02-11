/**
 * @param {Array<{ type?: string, label?: string, enabled?: boolean }>} items
 * @param {number} index
 */
export function getSelectableIndex(items, index) {
  let count = -1;
  for (let i = 0; i <= index; i += 1) {
    if (items[i].label !== "-" && items[i].enabled) {
      count += 1;
    }
  }
  return count;
}

/** @param {Array<{ type?: string, label?: string, enabled?: boolean }>} items */
function getContextMenuSelectableItems(items) {
  return items.filter((item) => item.label !== "-" && item.enabled);
}

/**
 * @param {object} ctx
 * @param {() => number} ctx.getContextMenuIndex
 * @param {(value: number) => void} ctx.setContextMenuIndex
 * @param {() => "blank" | "item"} ctx.getContextMenuMode
 * @param {() => Array<{ label?: string, enabled?: boolean, action?: () => void }>} getContextMenuItems
 * @param {() => void} closeContextMenu
 */
export function createContextMenuKeyboard(ctx, getContextMenuItems, closeContextMenu) {
  /** @param {KeyboardEvent} event */
  function handleContextMenuKey(event) {
    const items = getContextMenuItems();
    const selectable = getContextMenuSelectableItems(items);
    const currentIndex = ctx.getContextMenuIndex();
    if (event.key === "Escape") {
      event.preventDefault();
      closeContextMenu();
      return true;
    }
    if (selectable.length === 0) {
      return true;
    }
    if (event.key === "ArrowDown" || event.code === "ArrowDown") {
      event.preventDefault();
      const next = currentIndex < 0 ? 0 : (currentIndex + 1) % selectable.length;
      ctx.setContextMenuIndex(next);
      return true;
    }
    if (event.key === "ArrowUp" || event.code === "ArrowUp") {
      event.preventDefault();
      const next =
        currentIndex < 0
          ? selectable.length - 1
          : (currentIndex - 1 + selectable.length) % selectable.length;
      ctx.setContextMenuIndex(next);
      return true;
    }
    if (event.key === "Enter" || event.code === "Enter") {
      event.preventDefault();
      const index = currentIndex < 0 ? 0 : currentIndex;
      const action = selectable[index]?.action;
      if (action) action();
      return true;
    }
    return false;
  }

  return { handleContextMenuKey };
}
