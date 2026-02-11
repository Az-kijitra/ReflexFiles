import { createContextMenuActions } from "$lib/actions/context_menu";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function createPageContextMenuActions(ctx, deps) {
  return createContextMenuActions(ctx, deps);
}
