import { createMenuState } from "$lib/page_menu_state";

/**
 * @param {object} params
 * @param {() => string} params.getMenuOpen
 * @param {(value: string) => void} params.setMenuOpen
 */
export function buildMenuState(params) {
  return createMenuState({
    getMenuOpen: params.getMenuOpen,
    setMenuOpen: params.setMenuOpen,
  });
}
