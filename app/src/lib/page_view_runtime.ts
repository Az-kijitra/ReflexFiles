import { buildViewInputs } from "./page_view_inputs";
import { buildViewInputsFromParts } from "./page_view_inputs_from_vars";
import {
  buildViewInputActionsFromActions,
  buildViewInputMetaFromMeta,
  buildViewInputOverlayFromOverlay,
  buildViewInputStateFromState,
} from "./page_view_inputs_from_state";
import { buildViewPropsContext } from "./page_view_props_context";

/**
 * @param {{
 *   state: any;
 *   treeEl: HTMLElement | null;
 *   actions: Parameters<typeof buildViewInputActionsFromActions>[0];
 *   meta: Parameters<typeof buildViewInputMetaFromMeta>[0];
 *   overlay: Parameters<typeof buildViewInputOverlayFromOverlay>[0];
 * }} params
 */
export function createViewRuntime(params) {
  const viewInputState = buildViewInputStateFromState({
    state: params.state,
    treeEl: params.treeEl,
  });
  const viewInputActions = buildViewInputActionsFromActions(params.actions);
  const viewInputMeta = buildViewInputMetaFromMeta(params.meta);
  const viewInputOverlay = buildViewInputOverlayFromOverlay(params.overlay);

  const viewInputs = buildViewInputs(
    buildViewInputsFromParts({
      state: viewInputState,
      actions: viewInputActions,
      meta: viewInputMeta,
      overlay: viewInputOverlay,
    })
  );

  return {
    viewProps: buildViewPropsContext(viewInputs),
  };
}
