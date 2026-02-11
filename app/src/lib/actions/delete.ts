import { formatError } from "$lib/utils/error_format";

/**
 * @param {object} ctx
 * @param {object} helpers
 * @param {(message: string, durationMs?: number) => void} helpers.setStatusMessage
 * @param {(err: unknown) => void} helpers.showError
 * @param {(entry: import("$lib/types").UndoEntry) => void} helpers.pushUndoEntry
 */
export function createDeleteActions(ctx, helpers) {
  const { showError, pushUndoEntry } = helpers;

  async function confirmDelete() {
    const targets = ctx.getDeleteTargets();
    if (!targets.length) {
      ctx.setDeleteConfirmOpen(false);
      return;
    }
    try {
      const summary = await ctx.fsDeleteWithUndo(targets);
      if (summary?.trashed && summary.trashed.length) {
        const pairs = summary.trashed.map((item) => ({
          from: item.original,
          to: item.trashed,
        }));
        if (pairs.length) {
          pushUndoEntry({ kind: "delete", pairs });
        }
      }
      ctx.setDeleteConfirmOpen(false);
      ctx.setDeleteTargets([]);
      ctx.setDeleteError("");
      await ctx.loadDir(ctx.getCurrentPath());
    } catch (err) {
      const message = formatError(err, ctx.t("error.delete_failed"), ctx.t);
      ctx.setDeleteError(message);
      showError(message);
      ctx.setDeleteConfirmOpen(true);
      await ctx.tick();
      ctx.getDeleteModalEl()?.focus({ preventScroll: true });
    }
  }

  function cancelDelete() {
    ctx.setDeleteConfirmOpen(false);
    ctx.setDeleteTargets([]);
    ctx.setDeleteError("");
  }

  return {
    confirmDelete,
    cancelDelete,
  };
}
