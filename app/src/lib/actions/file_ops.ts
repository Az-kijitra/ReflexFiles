import { getParentPath } from "$lib/utils/path";
import { STATUS_LONG_MS } from "$lib/ui_durations";
import { formatError } from "$lib/utils/error_format";

/**
 * @param {object} ctx
 * @param {() => string[]} ctx.getSelectedPaths
 * @param {() => import("$lib/types").Entry[]} ctx.getEntries
 * @param {() => number} ctx.getFocusedIndex
 * @param {(paths: string[], options: { currentPath: string, entries: import("$lib/types").Entry[], getParentPath: (path: string) => string, duplicateSuffix: string }) => Array<{ from: string, to: string }>} ctx.buildDuplicatePairs
 * @param {(pairs: Array<{ from: string, to: string }>) => Promise<any>} ctx.fsCopyPairs
 * @param {(path: string, nextName: string) => Promise<void>} ctx.fsRename
 * @param {(path: string) => string} ctx.basename
 * @param {() => string} ctx.getCurrentPath
 * @param {(path: string) => Promise<void>} ctx.loadDir
 * @param {(key: string, vars?: Record<string, string | number>) => string} ctx.t
 * @param {object} deps
 * @param {(message: string, durationMs?: number) => void} deps.setStatusMessage
 * @param {(err: unknown) => void} deps.showError
 * @param {(title: string, failures: import("$lib/types").OpFailure[]) => void} deps.showFailures
 * @param {(entry: import("$lib/types").UndoEntry) => void} deps.pushUndoEntry
 */
export function createFileOpsActions(ctx, deps) {
  async function duplicateSelected() {
    const paths =
      ctx.getSelectedPaths().length > 0
        ? ctx.getSelectedPaths()
        : ctx.getEntries()[ctx.getFocusedIndex()]?.path
          ? [ctx.getEntries()[ctx.getFocusedIndex()].path]
          : [];
    if (!paths.length) {
      deps.setStatusMessage(ctx.t("status.no_selection"));
      return;
    }
    const pairs = ctx.buildDuplicatePairs(paths, {
      currentPath: ctx.getCurrentPath(),
      entries: ctx.getEntries(),
      getParentPath,
      duplicateSuffix: ctx.t("duplicate.suffix"),
    });
    if (!pairs.length) {
      deps.setStatusMessage(ctx.t("status.no_selection"));
      return;
    }
    try {
      const summary = await ctx.fsCopyPairs(pairs);
      const okCount = typeof summary?.ok === "number" ? summary.ok : pairs.length;
      const failCount = typeof summary?.failed === "number" ? summary.failed : 0;
      const totalCount =
        typeof summary?.total === "number" ? summary.total : okCount + failCount;
      if (failCount > 0) {
        deps.showFailures(ctx.t("status.duplicate_failed"), summary?.failures || []);
      }
      if (pairs.length && summary?.failures) {
        const failed = new Set(summary.failures.map((item) => item.path));
        const okPairs = pairs.filter((pair) => !failed.has(pair.from));
        if (okPairs.length) {
          deps.pushUndoEntry({ kind: "copy", pairs: okPairs });
        }
      } else if (pairs.length) {
        deps.pushUndoEntry({ kind: "copy", pairs });
      }
      const suffix = failCount ? ` (failed ${failCount})` : "";
      deps.setStatusMessage(
        `${ctx.t("status.duplicated", { count: okCount })} (${okCount}/${totalCount})${suffix}`,
      );
      await ctx.loadDir(ctx.getCurrentPath());
    } catch (err) {
      deps.showError(err);
    }
  }

  function formatDatePrefix() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}${month}${day}_`;
  }

  async function prefixDateSelected() {
    const targets =
      ctx.getSelectedPaths().length > 0
        ? ctx.getSelectedPaths()
        : ctx.getEntries()[ctx.getFocusedIndex()]?.path
          ? [ctx.getEntries()[ctx.getFocusedIndex()].path]
          : [];
    if (!targets.length) {
      deps.setStatusMessage(ctx.t("status.no_selection"));
      return;
    }
    const prefix = formatDatePrefix();
    const prefixRegex = /^\d{8}_/;
    let okCount = 0;
    let skipped = 0;
    /** @type {import("$lib/types").OpFailure[]} */
    const failures = [];
    for (const path of targets) {
      const entry = ctx.getEntries().find((e) => e.path === path);
      if (!entry) {
        failures.push({ path, code: "not_found", error: "not found" });
        continue;
      }
      const name = entry.name || ctx.basename(path);
      if (!name) {
        failures.push({ path, code: "invalid_path", error: "invalid name" });
        continue;
      }
      if (prefixRegex.test(name)) {
        skipped += 1;
        continue;
      }
      const nextName = `${prefix}${name}`;
      try {
        await ctx.fsRename(path, nextName);
        const parent = getParentPath(path);
        const nextPath = parent ? `${parent}\\${nextName}` : path;
        if (parent) {
          deps.pushUndoEntry({ kind: "rename", from: path, to: nextPath });
        }
        okCount += 1;
      } catch (err) {
        const message = formatError(err, ctx.t("error.rename_failed"), ctx.t);
        let code = "";
        const lower = message.toLowerCase();
        if (lower.includes("already exists")) code = "already_exists";
        else if (lower.includes("invalid")) code = "invalid_input";
        failures.push({ path, code, error: message });
      }
    }
    if (failures.length > 0) {
      deps.showFailures(ctx.t("status.prefix_date_failed"), failures);
    }
    if (okCount > 0 || skipped > 0) {
      let message = okCount > 0 ? ctx.t("status.prefixed_date", { count: okCount }) : "";
      if (skipped > 0) {
        const skippedText = ctx.t("prefix_date.skipped", { count: skipped });
        message = message ? `${message} / ${skippedText}` : skippedText;
      }
      deps.setStatusMessage(message, STATUS_LONG_MS);
    }
    if (okCount > 0) {
      await ctx.loadDir(ctx.getCurrentPath());
    }
  }

  return {
    duplicateSelected,
    prefixDateSelected,
  };
}
