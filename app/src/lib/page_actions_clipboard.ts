import { createClipboardActions } from "$lib/actions/clipboard";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function createPageClipboardActions(ctx, deps) {
  return createClipboardActions(ctx, deps);
}
