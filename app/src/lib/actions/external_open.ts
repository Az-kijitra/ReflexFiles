import { getParentPath } from "$lib/utils/path";
import { STATUS_LONG_MS, STATUS_SHORT_MS } from "$lib/ui_durations";
import { formatError } from "$lib/utils/error_format";

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
  async function openEntry(entry) {
    if (!entry) return;
    if (entry.type === "dir") {
      await ctx.loadDir(entry.path);
      return;
    }
    const app = resolveExternalApp(entry);
    if (app) {
      try {
        await ctx.invoke("external_open_with_app", { path: entry.path, app });
        return;
      } catch (err) {
        showError(err);
      }
    }
    try {
      await ctx.openPath(entry.path);
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

  function toFileUrl(path) {
    const normalized = String(path).replace(/\\/g, "/");
    if (/^[a-z]+:\/\//i.test(normalized)) return normalized;
    if (normalized.startsWith("/")) return `file://${normalized}`;
    return `file:///${normalized}`;
  }

  async function openUserManualWithFragment(fragment) {
    let lastError = null;
    const base = window.location?.origin || "";
    const baseIsHttp = /^https?:\/\//i.test(base);
    const isTauriLocalhost = /tauri\.localhost$/i.test(base);
    if (baseIsHttp && !isTauriLocalhost) {
      try {
        await ctx.openUrl(`${base}/user_manual.html#${fragment}`);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    try {
      const resourcePath = await resolveUserManualPath();
      const url = `${toFileUrl(resourcePath)}#${fragment}`;
      await ctx.openUrl(encodeURI(url));
      return;
    } catch (err) {
      lastError = err;
    }
    if (lastError) {
      showError(lastError);
    }
  }

  async function openKeymapHelp() {
    await openUserManualWithFragment("keymap");
  }

  async function resolveUserManualPath() {
    const dir = await ctx.resourceDir();
    const normalized = String(dir).replace(/[\\\/]+$/, "");
    const hasResources = /[\\\/]resources$/i.test(normalized);
    const baseDir = hasResources ? normalized : await ctx.joinPath(normalized, "resources");
    try {
      return await ctx.joinPath(baseDir, "user_manual.html");
    } catch {
      return await ctx.resolveResource("user_manual.html");
    }
  }

  async function openUserManual() {
    let lastError = null;
    const base = window.location?.origin || "";
    const baseIsHttp = /^https?:\/\//i.test(base);
    const isTauriLocalhost = /tauri\.localhost$/i.test(base);
    if (baseIsHttp && !isTauriLocalhost) {
      try {
        await ctx.openUrl(`${base}/user_manual.html`);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    try {
      const resourcePath = await resolveUserManualPath();
      const url = toFileUrl(resourcePath);
      await ctx.openUrl(encodeURI(url));
      return;
    } catch (err) {
      lastError = err;
    }
    if (lastError) {
      showError(lastError);
    }
  }

  function openAbout() {
    ctx.setAboutOpen(true);
  }

  function closeAbout() {
    ctx.setAboutOpen(false);
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
  };
}
