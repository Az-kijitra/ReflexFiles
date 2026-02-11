import { createDeleteActions } from "$lib/actions/delete";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function createPageDeleteActions(ctx, deps) {
  return createDeleteActions(ctx, deps);
}
