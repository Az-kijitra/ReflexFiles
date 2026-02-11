import { createUndoRedoActions } from "$lib/actions/undo_redo";

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function createPageUndoRedoActions(ctx, deps) {
  return createUndoRedoActions(ctx, deps);
}
