import { createPropertiesActions } from "$lib/actions/properties";
import { createPageActions } from "$lib/page_actions";

/**
 * @param {object} params
 * @param {object} params.propertiesCtx
 * @param {object} params.propertiesHelpers
 * @param {object} params.pageActionsCtx
 */
export function setupPageActions({ propertiesCtx, propertiesHelpers, pageActionsCtx }) {
  const propertiesActions = createPropertiesActions(propertiesCtx, propertiesHelpers);
  const pageActions = createPageActions({
    ...pageActionsCtx,
    openProperties: propertiesActions.openProperties,
  });
  return { propertiesActions, pageActions };
}
