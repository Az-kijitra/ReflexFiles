import type { ViewInputsParams } from "$lib/page_view_inputs_types";
import { buildViewInputsActions } from "./page_view_inputs_actions";
import { buildViewInputsMeta } from "./page_view_inputs_meta";
import { buildViewInputsOverlay } from "./page_view_inputs_overlay";
import { buildViewInputsState } from "./page_view_inputs_state";

export function buildViewInputs(params: ViewInputsParams) {
  return {
    state: buildViewInputsState(params),
    actions: buildViewInputsActions(params),
    meta: buildViewInputsMeta(params),
    overlay: buildViewInputsOverlay(params),
  };
}

