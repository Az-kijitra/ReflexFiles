import { createPageDeleteActions } from "$lib/page_actions_delete";
import { createPageFeedbackActions } from "$lib/page_actions_feedback";
import { createPageHistoryActions } from "$lib/page_actions_history";
import { createPageExternalActions } from "$lib/page_actions_external";
import { createPageEditActions } from "$lib/page_actions_edit";
import { createPageClipboardActions } from "$lib/page_actions_clipboard";
import { setupPageContextMenuWiring } from "$lib/page_actions_context_menu_wiring";
import { createPageFileOpsActions } from "$lib/page_actions_file_ops";
import { createPageSelectionActions } from "$lib/page_actions_selection";
import { createPageUndoRedoActions } from "$lib/page_actions_undo";

/**
 * @param {object} ctx
 */
export function buildFeedbackFeature(ctx) {
  return createPageFeedbackActions(ctx);
}

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function buildUndoFeature(ctx, deps) {
  return createPageUndoRedoActions(ctx, deps);
}

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function buildClipboardFeature(ctx, deps) {
  return createPageClipboardActions(ctx, deps);
}

/**
 * @param {object} ctx
 */
export function buildSelectionFeature(ctx) {
  return createPageSelectionActions(ctx);
}

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function buildHistoryFeature(ctx, deps) {
  return createPageHistoryActions(ctx, deps);
}

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function buildExternalFeature(ctx, deps) {
  return createPageExternalActions(ctx, deps);
}

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function buildEditFeature(ctx, deps) {
  return createPageEditActions(ctx, deps);
}

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function buildDeleteFeature(ctx, deps) {
  return createPageDeleteActions(ctx, deps);
}

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function buildFileOpsFeature(ctx, deps) {
  return createPageFileOpsActions(ctx, deps);
}

/**
 * @param {object} ctx
 * @param {object} deps
 */
export function buildContextMenuFeature(ctx, deps) {
  return setupPageContextMenuWiring(ctx, deps);
}
