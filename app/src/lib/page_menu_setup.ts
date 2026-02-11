import { buildMenuState } from "./page_menu_state_builder";
import { createMenuItemsGetter } from "./page_menu_items";
import { buildMenuItemsParams } from "./page_menu_items_params";

/**
 * @param {{
 *   menuState: Parameters<typeof buildMenuState>[0];
 *   menuItems:
 *     | Parameters<typeof buildMenuItemsParams>[0]
 *     | ((state: { toggleMenu: () => void; closeMenu: () => void }) => Parameters<typeof buildMenuItemsParams>[0]);
 * }} params
 */
export function setupMenuBundle(params) {
  const { toggleMenu, closeMenu } = buildMenuState(params.menuState);
  const menuItemsParams =
    typeof params.menuItems === "function" ? params.menuItems({ toggleMenu, closeMenu }) : params.menuItems;
  const getMenuItems = createMenuItemsGetter(buildMenuItemsParams(menuItemsParams));
  return { toggleMenu, closeMenu, getMenuItems };
}
