import { buildDomHandlersSetupInputsFromVars } from "./page_dom_handlers_inputs_from_vars";

/**
 * @param {{
 *   state: object | (() => object);
 *   actions: object | (() => object);
 *   helpers: object | (() => object);
 *   constants: { KEYMAP_ACTIONS: Record<string, string> };
 * }} params
 */
export function buildPageMountDomHandlersFromVars(params) {
  return buildDomHandlersSetupInputsFromVars({
    state: params.state,
    actions: params.actions,
    helpers: params.helpers,
    constants: params.constants,
  });
}
