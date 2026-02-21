import { getParentPath } from "$lib/utils/path";
import { toGdriveResourceRef } from "$lib/utils/resource_ref";
import { STATUS_LONG_MS, STATUS_SHORT_MS } from "$lib/ui_durations";
import { formatError } from "$lib/utils/error_format";
const VIEWER_SUPPORTED_EXTS = new Set([
  "md", "markdown",
  "png", "jpg", "jpeg", "bmp",
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
    return VIEWER_SUPPORTED_EXTS.has(ext);
  }

  function resolveResourceRef(path, entry = null) {
    const fromEntry = entry?.ref;
    if (
      fromEntry &&
      (fromEntry.provider === "local" || fromEntry.provider === "gdrive") &&
      String(fromEntry.resource_id || "").trim().length > 0
    ) {
      return fromEntry;
    }
    return toGdriveResourceRef(path);
  }

  /** @param {string} path */
  async function isProbablyTextByContent(path, resourceRef = null) {
    try {
      if (resourceRef) {
        const result = await ctx.invoke("fs_is_probably_text_by_ref", {
          resourceRef,
          sampleBytes: 65536,
        });
        return !!result;
      }
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
  async function openViewerWindow(path, jumpHint = undefined, resourceRef = null) {
    await ctx.invoke("open_viewer", {
      path,
      resourceRef,
      jumpHint,
      jump_hint: jumpHint,
    });
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
    const resourceRef = resolveResourceRef(entry.path, entry);
    if (!forceAssociatedApp && isViewerTarget(entry)) {
      try {
        await openViewerWindow(entry.path, undefined, resourceRef);
        return;
      } catch (err) {
        showError(err);
        return;
      }
    }
    if (!forceAssociatedApp) {
      const contentLooksText = await isProbablyTextByContent(entry.path, resourceRef);
      if (contentLooksText) {
        try {
          await openViewerWindow(entry.path, undefined, resourceRef);
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
    void openEntry(target);
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

  async function openInTerminalKind(kind) {
    const currentPath = ctx.getCurrentPath();
    if (!currentPath) return;
    try {
      await ctx.invoke("external_open_terminal_kind", { path: currentPath, kind });
    } catch (err) {
      showError(ctx.t("error.open_cmd_failed", { error: formatError(err, "unknown error", ctx.t) }));
    }
  }

  async function openInTerminalCmd() {
    await openInTerminalKind("cmd");
  }

  async function openInTerminalPowerShell() {
    await openInTerminalKind("powershell");
  }

  async function openInTerminalWsl() {
    await openInTerminalKind("wsl");
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rf:open-settings"));
      return;
    }
    try {
      await ctx.invoke("config_open_in_editor");
      setStatusMessage(ctx.t("status.opened_config"), STATUS_SHORT_MS);
    } catch (err) {
      const message = formatError(err, ctx.t("status.open_failed"), ctx.t);
      setStatusMessage(`${ctx.t("status.open_failed")}: ${message}`, STATUS_LONG_MS);
    }
  }

  function getManualLanguageId() {
    const value = String(ctx.getUiLanguage?.() || "en").toLowerCase();
    return value === "ja" ? "ja" : "en";
  }

  async function resolveUserManualMarkdownPath() {
    const dir = await ctx.resourceDir();
    const normalized = String(dir).replace(/[\\\/]+$/, "");
    const hasResources = /[\\\/]resources$/i.test(normalized);
    const baseDir = hasResources ? normalized : await ctx.joinPath(normalized, "resources");
    const lang = getManualLanguageId();
    const preferredName = `user_manual.${lang}.md`;

    try {
      return await ctx.joinPath(baseDir, preferredName);
    } catch {
      try {
        return await ctx.resolveResource(preferredName);
      } catch {
        try {
          return await ctx.joinPath(baseDir, "user_manual.md");
        } catch {
          return await ctx.resolveResource("user_manual.md");
        }
      }
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
    openInTerminalCmd,
    openInTerminalPowerShell,
    openInTerminalWsl,
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

