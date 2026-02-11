import { buildViewPropsBundle } from "./page_view_bundle";
import { buildViewState } from "./page_view_state";
import { buildViewActions } from "./page_view_actions";
import { buildViewMeta } from "./page_view_meta";
import { buildOverlayState } from "./page_overlay_state";
import { buildViewPropsInputsFromGroups } from "./page_view_props_inputs";

/**
 * @param {{
 *   state: Parameters<typeof buildViewState>[0];
 *   actions: Parameters<typeof buildViewActions>[0];
 *   meta: Parameters<typeof buildViewMeta>[0];
 *   overlay: Parameters<typeof buildOverlayState>[0];
 * }} params
 */
export function buildViewPropsContext(params) {
  const inputs = buildViewPropsInputsFromGroups(params);
  return buildViewPropsBundle({
    state: buildViewState(inputs.state),
    actions: buildViewActions(inputs.actions),
    ...buildViewMeta(inputs.meta),
    overlayState: buildOverlayState(inputs.overlay),
  });
}
