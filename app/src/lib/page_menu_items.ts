import { buildMenuItems } from "$lib/page_menus";

/**
 * @param {object} params
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(action: import("$lib/ui_types").ActionId) => string} params.getMenuShortcut
 * @param {() => Promise<void>} params.openFocusedOrSelected
 * @param {() => Promise<void>} params.openParentForSelection
 * @param {() => Promise<void>} params.openInExplorer
 * @param {() => Promise<void>} params.openInCmd
 * @param {() => Promise<void>} params.openInVSCode
 * @param {() => Promise<void>} params.openInGitClient
 * @param {() => void} params.copySelected
 * @param {() => void} params.duplicateSelected
 * @param {() => void} params.prefixDateSelected
 * @param {() => void} params.cutSelected
 * @param {() => Promise<void>} params.pasteItems
 * @param {() => void} params.requestDeleteSelected
 * @param {() => void} params.requestOpenPropertiesSelected
 * @param {() => void} params.invokeExit
 * @param {() => void} params.performUndo
 * @param {() => void} params.performRedo
 * @param {() => void} params.selectAll
 * @param {() => void} params.clearSelection
 * @param {() => void} params.invertSelection
 * @param {() => Promise<void>} params.openSearch
 * @param {() => void} params.openSortMenu
 * @param {() => void} params.toggleHidden
 * @param {() => void} params.toggleTree
 * @param {() => void} params.toggleTheme
 * @param {() => Promise<void>} params.refresh
 * @param {() => void} params.addJumpCurrent
 * @param {() => void} params.openJumpUrlModal
 * @param {() => void} params.openJumpList
 * @param {() => void} params.openHistoryList
 * @param {() => void} params.openKeymapHelp
 * @param {() => void} params.openUserManual
 * @param {() => void} params.openAbout
 * @param {() => void} params.closeMenu
 * @param {() => boolean} params.getShowHidden
 * @param {() => boolean} params.getShowTree
 * @param {() => import("$lib/ui_types").Theme} params.getTheme
 * @param {() => boolean} params.hasJumpList
 * @param {() => boolean} params.hasPathHistory
 * @param {(message: string, durationMs?: number) => void} params.setStatusMessage
 */
export function createMenuItemsGetter(params) {
  /** @param {import("$lib/ui_types").MenuGroup} group */
  return function getMenuItems(group) {
    return buildMenuItems(group, params);
  };
}
