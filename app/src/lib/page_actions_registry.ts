import { buildPageActionsOutput } from "$lib/page_actions_registry_output";
import { buildPageActionsFeatures } from "$lib/page_actions_registry_features";

/**
 * @param {object} ctx
 */
export function createPageActions(ctx) {
  return buildPageActionsOutput(buildPageActionsFeatures(ctx));
}
