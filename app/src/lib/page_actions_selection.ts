import { createSelectionActions } from "$lib/actions/selection";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function createPageSelectionActions(ctx, deps) {
  return createSelectionActions(ctx, deps);
}
