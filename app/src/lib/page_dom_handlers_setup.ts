import { buildDomHandlers } from "./page_dom_handlers_builder";
import { buildDomHandlersInputs } from "./page_dom_handlers_inputs";
import { buildDomHandlersState } from "./page_dom_handlers_state";
import { buildDomHandlersActions } from "./page_dom_handlers_actions";
import { buildDomHandlersHelpers } from "./page_dom_handlers_helpers";
import { buildDomHandlersConstants } from "./page_dom_handlers_constants";

/**
 * @param {{
 *   state: Parameters<typeof buildDomHandlersState>[0];
 *   actions: Parameters<typeof buildDomHandlersActions>[0];
 *   helpers: Parameters<typeof buildDomHandlersHelpers>[0];
 *   constants: Parameters<typeof buildDomHandlersConstants>[0];
 * }} params
 */
export function createDomHandlers(params) {
  const domHandlersInputs = buildDomHandlersInputs({
    state: buildDomHandlersState(params.state),
    actions: buildDomHandlersActions(params.actions),
    helpers: buildDomHandlersHelpers(params.helpers),
    constants: buildDomHandlersConstants(params.constants),
  });
  return buildDomHandlers(domHandlersInputs);
}
