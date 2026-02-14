import { getParentPath } from "$lib/utils/path";
import { STATUS_LONG_MS, STATUS_SHORT_MS } from "$lib/ui_durations";
import { formatError } from "$lib/utils/error_format";
const VIEWER_MARKDOWN_EXTS = new Set(["md", "markdown"]);
const VIEWER_IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "bmp"]);
const VIEWER_CODE_EXTS = new Set([
  "txt", "log", "json", "c", "h", "cpp", "cc", "cxx", "hpp", "hh", "hxx", "rs", "js", "ts", "py"
]);

/**
 * @param {object} ctx
 * @param {object} helpers
 * @param {(message: string, durationMs?: number) => void} helpers.setStatusMessage
 * @param {(err: unknown) => void} helpers.showError
 */
export function createExternalActions(ctx, helpers) {
  const { setStatusMessage, showError } = helpers;

  function getExternalApps() {
    return ctx.normalizeExternalApps(ctx.getExternalAppsRaw());
  }

  function getTargetEntry() {
    const selected = ctx.getSelectedPaths();
    if (selected.length === 1) {
      return ctx.getEntries().find((e) => e.path === selected[0]) || null;
    }
    return ctx.getEntries()[ctx.getFocusedIndex()] || null;
  }

  /**
   * @param {string[]} args
   * @param {string} path
   * @param {string} cwd
   */
  function buildExternalArgs(args, path, cwd) {
    return (args || []).map((arg) =>
      String(arg)
        .replaceAll("{path}", path)
        .replaceAll("{cwd}", cwd)
    );
  }

  /**
   * @param {import("$lib/types").ExternalAppConfig} app
   * @param {import("$lib/types").Entry | null} entry
   */
  async function runExternalApp(app, entry) {
    if (!app || !entry) {
      showError(ctx.t("error.no_associated_app"));
      return;
    }
    const currentPath = ctx.getCurrentPath();
    const targetPath =
      entry.type === "dir"
        ? entry.path
        : currentPath || entry.path;
    const args = buildExternalArgs(app.args || [], targetPath, currentPath || "");
    try {
      await ctx.invoke("external_open_custom", { command: app.command, args });
    } catch (err) {
      showError(err);
    }
  }

  /** @param {import("$lib/types").Entry} entry */
  function resolveExternalApp(entry) {
    if (!entry || entry.type !== "file") return "";
    const associations = ctx.getExternalAppAssociations();
    if (!associations || typeof associations !== "object") return "";
    const name = entry.name.toLowerCase();
    let ext = (entry.ext || "").toLowerCase();
    if (!ext) {
      const dot = name.lastIndexOf(".");
      ext = dot > 0 ? name.slice(dot) : "";
    }
    let exact = "";
    let wildcard = "";
    let wildcardLen = -1;
    for (const [patternRaw, app] of Object.entries(associations)) {
      if (!patternRaw || !app) continue;
      const pattern = patternRaw.toLowerCase();
      if (pattern.startsWith("*.")) {
        const suffix = pattern.slice(1);
        if (name.endsWith(suffix) && suffix.length > wildcardLen) {
          wildcard = app;
          wildcardLen = suffix.length;
        }
        continue;
      }
      if (pattern.startsWith(".")) {
        if (ext && ext === pattern) {
          exact = app;
          break;
        }
        if (name.endsWith(pattern) && pattern.length > wildcardLen) {
          wildcard = app;
          wildcardLen = pattern.length;
        }
        continue;
      }
      if (name === pattern) {
        exact = app;
        break;
      }
    }
    return exact || wildcard || "";
  }

  /** @param {import("$lib/types").Entry} entry */
  function detectEntryExtension(entry) {
    if (!entry || entry.type !== "file") return "";
    const ext = String(entry.ext || "").toLowerCase();
    if (ext) {
      return ext.startsWith(".") ? ext.slice(1) : ext;
    }
    const lowerName = String(entry.name || "").toLowerCase();
    const dot = lowerName.lastIndexOf(".");
    if (dot < 0 || dot === lowerName.length - 1) {
      return "";
    }
    return lowerName.slice(dot + 1);
  }

  /** @param {import("$lib/types").Entry} entry */
  function isViewerTarget(entry) {
    const ext = detectEntryExtension(entry);
    if (!ext) {
      return false;
    }
    return VIEWER_MARKDOWN_EXTS.has(ext) || VIEWER_IMAGE_EXTS.has(ext) || VIEWER_CODE_EXTS.has(ext);
  }

  /** @param {string} path */
  async function isProbablyTextByContent(path) {
    try {
      const result = await ctx.invoke("fs_is_probably_text", { path, sampleBytes: 65536 });
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * @param {string} path
   * @param {string | undefined} jumpHint
   */
  async function openViewerWindow(path, jumpHint = undefined) {
    await ctx.invoke("open_viewer", { path, jumpHint, jump_hint: jumpHint });
  }

  /** @param {string} path */
  async function openAssociatedApp(path) {
    await ctx.openPath(path);
  }

  /**
   * @param {import("$lib/types").Entry} entry
   * @param {{ forceAssociatedApp?: boolean }} [options]
   */
  async function openEntry(entry, options = undefined) {
    if (!entry) return;
    if (entry.type === "dir") {
      await ctx.loadDir(entry.path);
      return;
    }
    const forceAssociatedApp = !!options?.forceAssociatedApp;
    if (!forceAssociatedApp && isViewerTarget(entry)) {
      try {
        await openViewerWindow(entry.path);
        return;
      } catch (err) {
        showError(err);
        return;
      }
    }
    if (!forceAssociatedApp) {
      const contentLooksText = await isProbablyTextByContent(entry.path);
      if (contentLooksText) {
        try {
          await openViewerWindow(entry.path);
          return;
        } catch (err) {
          showError(err);
          return;
        }
      }
    }
    try {
      await openAssociatedApp(entry.path);
    } catch (err) {
      showError(err);
    }
  }

  function openFocusedOrSelected() {
    const selected = ctx.getSelectedPaths();
    const entries = ctx.getEntries();
    const focused = ctx.getFocusedIndex();
    const target =
      selected.length === 1
        ? entries.find((e) => e.path === selected[0])
        : entries[focused];
    if (!target) {
      setStatusMessage(ctx.t("status.no_selection"));
      return;
    }
    openEntry(target);
  }

  function openParentForSelection() {
    const selected = ctx.getSelectedPaths();
    if (selected.length === 1) {
      const parent = getParentPath(selected[0]);
      if (parent) ctx.loadDir(parent);
      else setStatusMessage(ctx.t("status.no_parent"));
      return;
    }
    const parent = getParentPath(ctx.getCurrentPath());
    if (parent) ctx.loadDir(parent);
    else setStatusMessage(ctx.t("status.no_parent"));
  }

  async function openInExplorer() {
    const currentPath = ctx.getCurrentPath();
    if (!currentPath) return;
    try {
      await ctx.invoke("external_open_explorer", { path: currentPath });
    } catch (err) {
      showError(ctx.t("error.open_explorer_failed", { error: formatError(err, "unknown error", ctx.t) }));
    }
  }

  async function openInCmd() {
    const currentPath = ctx.getCurrentPath();
    if (!currentPath) return;
    try {
      await ctx.invoke("external_open_cmd", { path: currentPath });
    } catch (err) {
      showError(ctx.t("error.open_cmd_failed", { error: formatError(err, "unknown error", ctx.t) }));
    }
  }

  async function openInVSCode() {
    const currentPath = ctx.getCurrentPath();
    if (!currentPath) return;
    try {
      await ctx.invoke("external_open_vscode", { path: currentPath });
    } catch (err) {
      showError(ctx.t("error.open_vscode_failed", { error: formatError(err, "unknown error", ctx.t) }));
    }
  }

  async function openInGitClient() {
    const currentPath = ctx.getCurrentPath();
    if (!currentPath) return;
    try {
      await ctx.invoke("external_open_git_client", { path: currentPath });
    } catch (err) {
      showError(ctx.t("error.open_git_failed", { error: formatError(err, "unknown error", ctx.t) }));
    }
  }

  async function openConfigFile() {
    try {
      await ctx.invoke("config_open_in_editor");
      setStatusMessage(ctx.t("status.opened_config"), STATUS_SHORT_MS);
    } catch (err) {
      const message = formatError(err, ctx.t("status.open_failed"), ctx.t);
      setStatusMessage(`${ctx.t("status.open_failed")}: ${message}`, STATUS_LONG_MS);
    }
  }

  async function resolveUserManualMarkdownPath() {
    const dir = await ctx.resourceDir();
    const normalized = String(dir).replace(/[\\\/]+$/, "");
    const hasResources = /[\\\/]resources$/i.test(normalized);
    const baseDir = hasResources ? normalized : await ctx.joinPath(normalized, "resources");
    try {
      return await ctx.joinPath(baseDir, "user_manual.md");
    } catch {
      return await ctx.resolveResource("user_manual.md");
    }
  }

  async function openKeymapHelp() {
    try {
      const resourcePath = await resolveUserManualMarkdownPath();
      await openViewerWindow(resourcePath, "keymap");
    } catch (err) {
      showError(err);
    }
  }

  async function openUserManual() {
    try {
      const resourcePath = await resolveUserManualMarkdownPath();
      await openViewerWindow(resourcePath);
    } catch (err) {
      showError(err);
    }
  }

  function openAbout() {
    ctx.setAboutOpen(true);
  }

  function closeAbout() {
    ctx.setAboutOpen(false);
  }


  async function closeViewer() {
    try {
      await ctx.invoke("close_viewer");
    } catch (err) {
      showError(err);
    }
  }

  return {
    getExternalApps,
    getTargetEntry,
    runExternalApp,
    openEntry,
    openFocusedOrSelected,
    openParentForSelection,
    openInExplorer,
    openInCmd,
    openInVSCode,
    openInGitClient,
    openConfigFile,
    openKeymapHelp,
    openUserManual,
    openAbout,
    closeAbout,
    closeViewer,
  };
}
