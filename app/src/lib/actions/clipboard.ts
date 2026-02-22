import { STATUS_LONG_MS, STATUS_MEDIUM_MS } from "$lib/ui_durations";
import { basename, makeDuplicateName } from "$lib/utils/file_ops";

/**
 * @param {object} ctx
 * @param {object} helpers
 * @param {(message: string, durationMs?: number) => void} helpers.setStatusMessage
 * @param {(err: unknown) => void} helpers.showError
 * @param {(title: string, failures: import("$lib/types").OpFailure[]) => void} helpers.showFailures
 * @param {(entry: import("$lib/types").UndoEntry) => void} helpers.pushUndoEntry
 */
export function createClipboardActions(ctx, helpers) {
  const { setStatusMessage, showError, showFailures, pushUndoEntry } = helpers;
  const isCurrentPathGdrive = () =>
    String(ctx.getCurrentPath?.() || "")
      .trim()
      .toLowerCase()
      .startsWith("gdrive://");
  const currentPathCanPaste = () => {
    const caps = ctx.getCurrentPathCapabilities?.();
    const canCopy = Boolean(caps?.can_copy ?? true);
    const canMove = Boolean(caps?.can_move ?? true);
    return canCopy || canMove;
  };
  const notifyPasteUnavailable = () => {
    setStatusMessage(
      isCurrentPathGdrive() ? ctx.t("paste.destination_not_writable") : ctx.t("capability.not_available")
    );
  };

  async function confirmPasteOverwrite() {
    ctx.setPasteConfirmOpen(false);
    const paths = ctx.getPastePendingPaths();
    ctx.setPastePendingPaths([]);
    ctx.setPasteConflicts([]);
    await runPaste(paths, ctx.getPasteMode() === "cut");
  }

  async function confirmPasteSkip() {
    ctx.setPasteConfirmOpen(false);
    const conflicts = new Set(ctx.getPasteConflicts());
    const filtered = ctx.getPastePendingPaths().filter((p) => {
      const name = p.split(/[\\\/]/).pop();
      return !name || !conflicts.has(name);
    });
    ctx.setPastePendingPaths([]);
    ctx.setPasteConflicts([]);
    await runPaste(filtered, ctx.getPasteMode() === "cut");
  }

  async function confirmPasteKeepBoth() {
    ctx.setPasteConfirmOpen(false);
    const paths = ctx.getPastePendingPaths();
    const conflicts = new Set(ctx.getPasteConflicts().map((name) => String(name || "").toLowerCase()));
    const entries = ctx.getEntries();
    const existingLower = new Set(entries.map((entry) => String(entry?.name || "").toLowerCase()));
    const nameOverrides = {};
    for (const path of paths) {
      const name = basename(path);
      if (!name) continue;
      if (!conflicts.has(name.toLowerCase())) continue;
      const nextName = makeDuplicateName(name, existingLower, ctx.t("duplicate.suffix"));
      existingLower.add(nextName.toLowerCase());
      nameOverrides[path] = nextName;
    }
    ctx.setPastePendingPaths([]);
    ctx.setPasteConflicts([]);
    await runPaste(paths, ctx.getPasteMode() === "cut", nameOverrides);
  }

  function cancelPasteConfirm() {
    ctx.setPasteConfirmOpen(false);
    ctx.setPastePendingPaths([]);
    ctx.setPasteConflicts([]);
    ctx.setPasteConfirmIndex(0);
  }

  function copySelected() {
    const paths =
      ctx.getSelectedPaths().length > 0
        ? ctx.getSelectedPaths()
        : ctx.getEntries()[ctx.getFocusedIndex()]?.path
          ? [ctx.getEntries()[ctx.getFocusedIndex()].path]
          : [];
    if (!paths.length) {
      setStatusMessage(ctx.t("status.no_selection"));
      return;
    }
    ctx.setLastClipboard({ paths: [...paths], cut: false });
    ctx.clipboardSetFiles(paths, false, null)
      .then(() => {
        setStatusMessage(ctx.t("status.copied", { count: paths.length }), STATUS_LONG_MS);
      })
      .catch((err) => {
        showError(err);
      });
  }

  function cutSelected() {
    const paths =
      ctx.getSelectedPaths().length > 0
        ? ctx.getSelectedPaths()
        : ctx.getEntries()[ctx.getFocusedIndex()]?.path
          ? [ctx.getEntries()[ctx.getFocusedIndex()].path]
          : [];
    if (!paths.length) {
      setStatusMessage(ctx.t("status.no_selection"));
      return;
    }
    ctx.setLastClipboard({ paths: [...paths], cut: true });
    ctx.clipboardSetFiles(paths, true, null)
      .then(() => {
        setStatusMessage(ctx.t("status.cut", { count: paths.length }), STATUS_LONG_MS);
      })
      .catch((err) => {
        showError(err);
      });
  }

  async function pasteItems() {
    try {
      if (!currentPathCanPaste()) {
        notifyPasteUnavailable();
        return;
      }
      const clip = await ctx.clipboardGetFiles();
      const lastClipboard = ctx.getLastClipboard();
      const effectiveClip =
        clip?.paths && clip.paths.length
          ? clip
          : lastClipboard.paths.length
            ? lastClipboard
            : clip;
      if (!effectiveClip.paths || !effectiveClip.paths.length) {
        showError(ctx.t("paste.empty_clipboard"));
        return;
      }
      const conflictNames = ctx.getPasteConflicts(effectiveClip.paths, ctx.getEntries());
      if (conflictNames.length) {
        ctx.setPasteConflicts(conflictNames);
        ctx.setPasteMode(effectiveClip.cut ? "cut" : "copy");
        ctx.setPastePendingPaths(effectiveClip.paths);
        ctx.setPasteApplyAll(true);
        ctx.setPasteConfirmOpen(true);
        return;
      }
      await runPaste(effectiveClip.paths, effectiveClip.cut);
    } catch (err) {
      showError(err);
    }
  }

  /**
   * @param {string[]} paths
   * @param {boolean} cut
   */
  async function runPaste(paths, cut, nameOverrides = null) {
    const currentPath = ctx.getCurrentPath();
    if (!paths.length) {
      setStatusMessage(ctx.t("paste.nothing"));
      return false;
    }
    const sameTarget = paths.filter((p) => ctx.isSamePathTarget(p, currentPath));
    const filtered = paths.filter((p) => !ctx.isSamePathTarget(p, currentPath));
    if (sameTarget.length && !filtered.length) {
      setStatusMessage(ctx.t("status.same_path"));
      return false;
    }
    try {
      const base = cut ? ctx.t("status.moving") : ctx.t("status.copying");
      const pairs = ctx.buildPastePairs(filtered, currentPath);
      const involvesGdrive =
        String(currentPath || "").trim().toLowerCase().startsWith("gdrive://") ||
        filtered.some((path) => String(path || "").trim().toLowerCase().startsWith("gdrive://"));
      if (cut) {
        const summary = await ctx.fsMove(filtered, currentPath);
        const okCount = typeof summary?.ok === "number" ? summary.ok : filtered.length;
        const failCount = typeof summary?.failed === "number" ? summary.failed : 0;
        const totalCount =
          typeof summary?.total === "number" ? summary.total : okCount + failCount;
        if (failCount > 0) {
          showFailures(`${base} failed`, summary?.failures || []);
        }
        if (pairs.length && summary?.failures) {
          const failed = new Set(summary.failures.map((item) => item.path));
          const okPairs = pairs.filter((pair) => !failed.has(pair.from));
          if (okPairs.length) {
            pushUndoEntry({ kind: "move", pairs: okPairs });
          }
        } else if (pairs.length) {
          pushUndoEntry({ kind: "move", pairs });
        }
        const suffix = failCount ? ` (failed ${failCount})` : "";
        setStatusMessage(`${base} ${okCount}/${totalCount} item(s)${suffix}`);
      } else {
        const summary = await ctx.fsCopy(filtered, currentPath, nameOverrides);
        const okCount = typeof summary?.ok === "number" ? summary.ok : filtered.length;
        const failCount = typeof summary?.failed === "number" ? summary.failed : 0;
        const totalCount =
          typeof summary?.total === "number" ? summary.total : okCount + failCount;
        if (failCount > 0) {
          showFailures(`${base} failed`, summary?.failures || []);
        }
        if (!involvesGdrive) {
          if (pairs.length && summary?.failures) {
            const failed = new Set(summary.failures.map((item) => item.path));
            const okPairs = pairs.filter((pair) => !failed.has(pair.from));
            if (okPairs.length) {
              pushUndoEntry({ kind: "copy", pairs: okPairs });
            }
          } else if (pairs.length) {
            pushUndoEntry({ kind: "copy", pairs });
          }
        }
        const suffix = failCount ? ` (failed ${failCount})` : "";
        setStatusMessage(`${base} ${okCount}/${totalCount} item(s)${suffix}`);
      }
      await ctx.loadDir(currentPath);
      const skipped = sameTarget.length;
      if (skipped) {
        setStatusMessage(`${base} (skipped ${skipped})`, STATUS_MEDIUM_MS);
      }
      return true;
    } catch (err) {
      showError(err);
      return false;
    }
  }

  return {
    confirmPasteOverwrite,
    confirmPasteSkip,
    confirmPasteKeepBoth,
    cancelPasteConfirm,
    copySelected,
    cutSelected,
    pasteItems,
    runPaste,
  };
}
