import {
  buildPageActionsRefsFromElements,
  buildPageActionsStateFromVars,
} from "./page_actions_context";
import { buildPageActionsDeps } from "./page_actions_deps";

/**
 * @param {{
 *   state: () => Record<string, any>;
 *   refs: Parameters<typeof buildPageActionsRefsFromElements>[0];
 *   deps: Parameters<typeof buildPageActionsDeps>[0];
 * }} params
 */
export function buildPageActionsContextFromVars(params) {
  return {
    state: buildPageActionsStateFromVars(params.state),
    refs: buildPageActionsRefsFromElements(params.refs),
    deps: buildPageActionsDeps(params.deps),
  };
}
