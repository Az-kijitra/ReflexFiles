/**
 * @param {object} params
 * @param {() => boolean} params.getContextMenuOpen
 * @param {() => HTMLElement | null} params.getContextMenuEl
 * @param {() => void} params.closeContextMenu
 * @param {() => string} params.getMenuOpen
 * @param {() => HTMLElement | null} params.getMenuBarEl
 * @param {() => void} params.closeMenu
 */
export function createPageClickHandler(params) {
  return function onClick(event) {
    if (
      params.getContextMenuOpen() &&
      params.getContextMenuEl() &&
      params.getContextMenuEl().contains(event.target)
    ) {
      return;
    }
    if (params.getContextMenuOpen()) params.closeContextMenu();
    if (params.getMenuOpen() && params.getMenuBarEl() && !params.getMenuBarEl().contains(event.target)) {
      params.closeMenu();
    }
  };
}
