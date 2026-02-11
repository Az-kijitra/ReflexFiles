import { createFileOpsActions } from "$lib/actions/file_ops";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function createPageFileOpsActions(ctx, deps) {
  return createFileOpsActions(ctx, deps);
}
