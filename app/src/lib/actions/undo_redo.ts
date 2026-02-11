import { getParentPath } from "$lib/utils/path";
import { STATUS_MEDIUM_MS } from "$lib/ui_durations";

/**
 * @param {object} ctx
 * @param {object} helpers
 * @param {(message: string, durationMs?: number) => void} helpers.setStatusMessage
 * @param {(err: unknown) => void} helpers.showError
 * @param {(title: string, failures: import("$lib/types").OpFailure[]) => void} [helpers.showFailures]
 */
export function createUndoRedoActions(ctx, helpers) {
  const { setStatusMessage, showError, showFailures } = helpers;

  /** @param {import("$lib/types").UndoEntry} entry */
  function pushUndoEntry(entry) {
    ctx.setUndoStack([entry, ...ctx.getUndoStack()].slice(0, ctx.undoLimit));
    ctx.setRedoStack([]);
  }

  function groupPairsByDestination(pairs, useFromParent) {
    const groups = new Map();
    for (const pair of pairs) {
      const destination = getParentPath(useFromParent ? pair.from : pair.to);
      const item = useFromParent ? pair.to : pair.from;
      if (!destination || !item) continue;
      const list = groups.get(destination) || [];
      list.push(item);
      groups.set(destination, list);
    }
    return groups;
  }

  function reportUnavailable(title, code, reason) {
    const message = reason || ctx.t("status.failed", { name: "", reason: "" });
    if (showFailures) {
      showFailures(title, [
        {
          path: "-",
          code,
          error: message,
        },
      ]);
    } else {
      setStatusMessage(message);
    }
  }

  function ensureSummaryOk(summary, title) {
    const failed =
      summary && typeof summary.failed === "number" ? summary.failed : 0;
    if (failed > 0) {
      showFailures?.(title, summary?.failures || []);
      return false;
    }
    return true;
  }

  /** @param {import("$lib/types").UndoEntry} entry */
  async function applyUndoEntry(entry) {
    if (entry.kind === "copy") {
      const targets = entry.pairs.map((pair) => pair.to).filter(Boolean);
      if (!targets.length) {
        reportUnavailable(
          ctx.t("status.undo_failed"),
          "undo_unavailable",
          ctx.t("failure.code.no_items")
        );
        return false;
      }
      await ctx.fsDeleteTrash(targets);
      return true;
    }
    if (entry.kind === "move") {
      const groups = groupPairsByDestination(entry.pairs, true);
      if (groups.size === 0) {
        reportUnavailable(
          ctx.t("status.undo_failed"),
          "undo_unavailable",
          ctx.t("failure.code.no_items")
        );
        return false;
      }
      for (const [destination, items] of groups) {
        const summary = await ctx.fsMove(items, destination);
        if (!ensureSummaryOk(summary, ctx.t("status.undo_failed"))) {
          return false;
        }
      }
      return true;
    }
    if (entry.kind === "rename") {
      await ctx.fsRename(entry.to, ctx.basename(entry.from));
      return true;
    }
    if (entry.kind === "delete") {
      const groups = new Map();
      for (const pair of entry.pairs) {
        const destination = getParentPath(pair.from);
        const item = pair.to;
        if (!destination || !item) continue;
        const list = groups.get(destination) || [];
        list.push(item);
        groups.set(destination, list);
      }
      if (groups.size === 0) {
        reportUnavailable(
          ctx.t("status.undo_failed"),
          "undo_unavailable",
          ctx.t("failure.code.no_items")
        );
        return false;
      }
      for (const [destination, items] of groups) {
        const summary = await ctx.fsMove(items, destination);
        if (!ensureSummaryOk(summary, ctx.t("status.undo_failed"))) {
          return false;
        }
      }
      return true;
    }
    if (entry.kind === "create") {
      if (!entry.path) {
        reportUnavailable(
          ctx.t("status.undo_failed"),
          "undo_unavailable",
          ctx.t("failure.code.invalid_path")
        );
        return false;
      }
      await ctx.fsDeleteTrash([entry.path]);
      return true;
    }
    return false;
  }

  /** @param {import("$lib/types").UndoEntry} entry */
  async function applyRedoEntry(entry) {
    if (entry.kind === "copy") {
      if (!entry.pairs || entry.pairs.length === 0) {
        reportUnavailable(
          ctx.t("status.redo_failed"),
          "redo_unavailable",
          ctx.t("failure.code.no_items")
        );
        return false;
      }
      const summary = await ctx.fsCopyPairs(entry.pairs);
      if (!ensureSummaryOk(summary, ctx.t("status.redo_failed"))) {
        return false;
      }
      return true;
    }
    if (entry.kind === "move") {
      const groups = groupPairsByDestination(entry.pairs, false);
      if (groups.size === 0) {
        reportUnavailable(
          ctx.t("status.redo_failed"),
          "redo_unavailable",
          ctx.t("failure.code.no_items")
        );
        return false;
      }
      for (const [destination, items] of groups) {
        const summary = await ctx.fsMove(items, destination);
        if (!ensureSummaryOk(summary, ctx.t("status.redo_failed"))) {
          return false;
        }
      }
      return true;
    }
    if (entry.kind === "rename") {
      await ctx.fsRename(entry.from, ctx.basename(entry.to));
      return true;
    }
    if (entry.kind === "delete") {
      const groups = new Map();
      for (const pair of entry.pairs) {
        const destination = getParentPath(pair.to);
        const item = pair.from;
        if (!destination || !item) continue;
        const list = groups.get(destination) || [];
        list.push(item);
        groups.set(destination, list);
      }
      if (groups.size === 0) {
        reportUnavailable(
          ctx.t("status.redo_failed"),
          "redo_unavailable",
          ctx.t("failure.code.no_items")
        );
        return false;
      }
      for (const [destination, items] of groups) {
        const summary = await ctx.fsMove(items, destination);
        if (!ensureSummaryOk(summary, ctx.t("status.redo_failed"))) {
          return false;
        }
      }
      return true;
    }
    if (entry.kind === "create") {
      const parent = getParentPath(entry.path);
      const name = ctx.basename(entry.path);
      if (!parent || !name) {
        reportUnavailable(
          ctx.t("status.redo_failed"),
          "redo_unavailable",
          ctx.t("failure.code.invalid_path")
        );
        return false;
      }
      await ctx.fsCreate(parent, name, entry.createKind);
      return true;
    }
    return false;
  }

  async function performUndo() {
    const undoStack = ctx.getUndoStack();
    if (!undoStack.length) {
      setStatusMessage(ctx.t("status.undo_empty"));
      return;
    }
    const entry = undoStack[0];
    try {
      const applied = await applyUndoEntry(entry);
      if (!applied) {
        setStatusMessage(ctx.t("status.undo_failed"));
        return;
      }
      ctx.setUndoStack(undoStack.slice(1));
      ctx.setRedoStack([entry, ...ctx.getRedoStack()].slice(0, ctx.undoLimit));
      await ctx.loadDir(ctx.getCurrentPath());
      setStatusMessage(ctx.t("status.undo_done"), STATUS_MEDIUM_MS);
    } catch (err) {
      showError(err);
    }
  }

  async function performRedo() {
    const redoStack = ctx.getRedoStack();
    if (!redoStack.length) {
      setStatusMessage(ctx.t("status.redo_empty"));
      return;
    }
    const entry = redoStack[0];
    try {
      const applied = await applyRedoEntry(entry);
      if (!applied) {
        setStatusMessage(ctx.t("status.redo_failed"));
        return;
      }
      ctx.setRedoStack(redoStack.slice(1));
      ctx.setUndoStack([entry, ...ctx.getUndoStack()].slice(0, ctx.undoLimit));
      await ctx.loadDir(ctx.getCurrentPath());
      setStatusMessage(ctx.t("status.redo_done"), STATUS_MEDIUM_MS);
    } catch (err) {
      showError(err);
    }
  }

  return {
    pushUndoEntry,
    performUndo,
    performRedo,
  };
}
