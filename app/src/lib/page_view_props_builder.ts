import { buildMenuViewInputs } from "./view_menu_inputs";
import { buildPathBarViewInputs } from "./view_path_bar_inputs";
import { buildTreeViewInputs } from "./view_tree_inputs";
import { buildListViewInputs } from "./view_list_inputs";
import { buildOverlayViewInputs } from "./view_overlay_inputs";

/**
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.actions
 * @param {object} params.formatters
 * @param {object} params.constants
 * @param {object} params.helpers
 */
export function buildViewPropsInputs({ state, actions, formatters, constants, helpers }) {
  return {
    menu: buildMenuViewInputs({ state, actions, constants, helpers }),
    pathBar: buildPathBarViewInputs({ state, actions, helpers }),
    tree: buildTreeViewInputs({ state, actions, helpers }),
    fileList: buildListViewInputs({ state, actions, formatters, helpers }),
    overlay: buildOverlayViewInputs({ state, actions, formatters, constants, helpers }),
  };
}
