import { createExternalActions } from "$lib/actions/external_open";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function createPageExternalActions(ctx, deps) {
  return createExternalActions(ctx, deps);
}
