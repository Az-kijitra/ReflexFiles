import type { ViewPropsInputsParams } from "$lib/page_view_props_inputs_types";
import { buildViewPropsInputsActions } from "./page_view_props_inputs_actions";
import { buildViewPropsInputsMeta } from "./page_view_props_inputs_meta";
import { buildViewPropsInputsOverlay } from "./page_view_props_inputs_overlay";
import { buildViewPropsInputsState } from "./page_view_props_inputs_state";

export function buildViewPropsInputsFromGroups(params: ViewPropsInputsParams) {
  return {
    state: buildViewPropsInputsState(params),
    actions: buildViewPropsInputsActions(params),
    meta: buildViewPropsInputsMeta(params),
    overlay: buildViewPropsInputsOverlay(params),
  };
}

