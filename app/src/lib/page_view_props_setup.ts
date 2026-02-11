import {
  buildMenuProps,
  buildPathBarProps,
  buildTreeProps,
  buildFileListProps,
  buildOverlayProps,
} from "./page_view_props";
import { buildViewPropsInputs } from "./page_view_props_builder";
import { buildOverlayBindings } from "./page_overlays_bindings";

/**
 * @param {{
 *   view: Parameters<typeof buildViewPropsInputs>[0];
 *   overlayState: Parameters<typeof buildOverlayBindings>[0]["state"];
 * }} params
 */
export function buildPageViewProps(params) {
  const inputs = buildViewPropsInputs(params.view);
  return {
    menuProps: buildMenuProps(inputs.menu),
    pathBarProps: buildPathBarProps(inputs.pathBar),
    treeProps: buildTreeProps(inputs.tree),
    fileListProps: buildFileListProps(inputs.fileList),
    overlayProps: buildOverlayProps(inputs.overlay),
    overlayBindings: buildOverlayBindings({ state: params.overlayState }),
  };
}
