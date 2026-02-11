import { buildEditMenuItems } from "./menus/edit";
import { buildFileMenuItems } from "./menus/file";
import { buildHelpMenuItems } from "./menus/help";
import { buildNavigateMenuItems } from "./menus/navigate";
import { buildViewMenuItems } from "./menus/view";

/**
 * @param {import("$lib/ui_types").MenuGroup} group
 * @param {object} params
 */
export function buildMenuItems(group, params) {
  if (group === "file") return buildFileMenuItems(params);
  if (group === "edit") return buildEditMenuItems(params);
  if (group === "view") return buildViewMenuItems(params);
  if (group === "navigate") return buildNavigateMenuItems(params);
  if (group === "help") return buildHelpMenuItems(params);
  return [];
}
