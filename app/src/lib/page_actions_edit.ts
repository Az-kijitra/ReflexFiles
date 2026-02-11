import { createEditEntryActions } from "$lib/actions/edit_entries";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function createPageEditActions(ctx, deps) {
  return createEditEntryActions(ctx, deps);
}
