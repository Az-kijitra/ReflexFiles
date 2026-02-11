import { setupPageInit } from "./page_init_setup";
import { buildPageInitInputsFromState } from "./page_init_inputs_from_state";

/**
 * @param {Parameters<typeof buildPageInitInputsFromState>[0]} params
 */
export function setupPageInitFromState(params) {
  return setupPageInit(buildPageInitInputsFromState(params));
}
