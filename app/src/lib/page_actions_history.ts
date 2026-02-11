import { createHistoryActions } from "$lib/actions/history";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function createPageHistoryActions(ctx, deps) {
  return createHistoryActions(ctx, deps);
}
