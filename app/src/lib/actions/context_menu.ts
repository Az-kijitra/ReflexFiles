import { createContextMenuKeyboard, getSelectableIndex } from "./context_menu/context_menu_keyboard";
import { createContextMenuItems } from "./context_menu/context_menu_items";
import { createContextMenuState } from "./context_menu/context_menu_state";

/**
 * @param {object} ctx
 * @param {object} actions
 */
export function createContextMenuActions(ctx, actions) {
  const { openContextMenu, closeContextMenu } = createContextMenuState(ctx);
  const { getContextMenuItems, onContextDelete, onContextProperties } = createContextMenuItems(
    ctx,
    actions,
    closeContextMenu
  );
  const { handleContextMenuKey } = createContextMenuKeyboard(
    ctx,
    getContextMenuItems,
    closeContextMenu
  );

  return {
    openContextMenu,
    closeContextMenu,
    getSelectableIndex,
    handleContextMenuKey,
    getContextMenuItems,
    onContextDelete,
    onContextProperties,
  };
}
