import { getParentPath } from "$lib/utils/path";
import { formatError } from "$lib/utils/error_format";

/**
 * @param {object} ctx
 * @param {object} helpers
 * @param {(message: string, durationMs?: number) => void} helpers.setStatusMessage
 * @param {(err: unknown) => void} helpers.showError
 * @param {(entry: import("$lib/types").UndoEntry) => void} helpers.pushUndoEntry
 */
export function createEditEntryActions(ctx, helpers) {
  const { setStatusMessage, showError, pushUndoEntry } = helpers;

  /** @param {import("$lib/types").Entry} entry */
  function openRename(entry) {
    if (!entry) return;
    ctx.setRenameTarget(entry.path);
    ctx.setRenameValue(entry.name || "");
    ctx.setRenameError("");
    ctx.setRenameOpen(true);
  }

  async function confirmRename() {
    const target = ctx.getRenameTarget();
    if (!target) {
      ctx.setRenameOpen(false);
      return;
    }
    const nextName = ctx.getRenameValue().trim();
    if (!nextName) {
      ctx.setRenameError(ctx.t("error.name_required"));
      return;
    }
    try {
      await ctx.fsRename(target, nextName);
      const parent = getParentPath(target);
      const nextPath = parent ? `${parent}\\${nextName}` : target;
      if (parent) {
        pushUndoEntry({ kind: "rename", from: target, to: nextPath });
      }
      ctx.setRenameOpen(false);
      ctx.setRenameTarget("");
      ctx.setRenameValue("");
      ctx.setRenameError("");
      await ctx.loadDir(ctx.getCurrentPath());
    } catch (err) {
      const message = formatError(err, ctx.t("error.rename_failed"), ctx.t);
      ctx.setRenameError(message);
      showError(message);
      await ctx.tick();
      const inputEl = ctx.getRenameInputEl();
      if (inputEl) {
        inputEl.focus({ preventScroll: true });
        inputEl.select();
      } else {
        ctx.getRenameModalEl()?.focus();
      }
    }
  }

  function cancelRename() {
    ctx.setRenameOpen(false);
    ctx.setRenameTarget("");
    ctx.setRenameValue("");
    ctx.setRenameError("");
  }

  /** @param {"file" | "folder"} kind */
  function openCreate(kind) {
    ctx.setCreateType(kind === "folder" ? "folder" : "file");
    ctx.setCreateName("");
    ctx.setCreateError("");
    ctx.setCreateOpen(true);
  }

  async function confirmCreate() {
    const name = ctx.getCreateName().trim();
    if (!name) {
      ctx.setCreateError(ctx.t("error.name_required"));
      return;
    }
    const currentPath = ctx.getCurrentPath();
    if (!currentPath) {
      ctx.setCreateError(ctx.t("error.no_current_path"));
      return;
    }
    try {
      await ctx.fsCreate(currentPath, name, ctx.getCreateType());
      pushUndoEntry({
        kind: "create",
        path: `${currentPath}\\${name}`,
        createKind: ctx.getCreateType(),
      });
      ctx.setCreateOpen(false);
      ctx.setCreateName("");
      ctx.setCreateError("");
      await ctx.loadDir(currentPath);
    } catch (err) {
      const message = formatError(err, ctx.t("error.create_failed"), ctx.t);
      ctx.setCreateError(message);
      showError(message);
      await ctx.tick();
      const inputEl = ctx.getCreateInputEl();
      if (inputEl) {
        inputEl.focus({ preventScroll: true });
        inputEl.select();
      } else {
        ctx.getCreateModalEl()?.focus();
      }
    }
  }

  function cancelCreate() {
    ctx.setCreateOpen(false);
    ctx.setCreateName("");
    ctx.setCreateError("");
  }

  return {
    openRename,
    confirmRename,
    cancelRename,
    openCreate,
    confirmCreate,
    cancelCreate,
  };
}
