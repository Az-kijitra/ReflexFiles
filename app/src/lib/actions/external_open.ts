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
  const gdriveWorkcopyMap = new Map();

  function gdriveWorkcopyKey(resourceRef) {
    const provider = String(resourceRef?.provider || "").trim().toLowerCase();
    const resourceId = String(resourceRef?.resource_id || "").trim();
    if (provider !== "gdrive" || !resourceId) {
      return "";
    }
    return `gdrive:${resourceId}`;
  }

  function getExternalApps() {
    return ctx.normalizeExternalApps(ctx.getExternalAppsRaw());
  }

  function normalizeCachedResourceRef(resourceRef) {
    return {
      provider: "gdrive",
      resource_id: String(resourceRef?.resource_id || "").trim(),
    };
  }

  function updateCachedWorkcopyFromState(resourceRef, state) {
    const key = gdriveWorkcopyKey(resourceRef);
    if (!key) return null;
    const exists = Boolean(state?.exists);
    const localPath = String(state?.localPath || "").trim();
    const revision = state?.revision || null;
    if (!exists || !localPath || !revision) {
      gdriveWorkcopyMap.delete(key);
      return null;
    }
    const cached = gdriveWorkcopyMap.get(key) || {};
    const next = {
      resourceRef: normalizeCachedResourceRef(resourceRef),
      localPath,
      fileName: String(state?.fileName || cached.fileName || "").trim() || "file",
      revision,
      dirty: Boolean(state?.dirty),
    };
    gdriveWorkcopyMap.set(key, next);
    return next;
  }

  async function loadCachedWorkcopyFromBackend(resourceRef) {
    const state = await ctx.invoke("gdrive_get_edit_workcopy_state", { resourceRef });
    return updateCachedWorkcopyFromState(resourceRef, state);
  }

  /**
   * @param {import("$lib/types").Entry[] | null | undefined} entries
   */
  async function refreshGdriveWorkcopyBadges(entries = undefined) {
    const source = Array.isArray(entries) ? entries : ctx.getEntries();
    if (!Array.isArray(source) || source.length === 0) return;
    const refs = [];
    const seenResourceIds = new Set();
    for (const entry of source) {
      if (!entry || entry.type !== "file") continue;
      const resourceRef = resolveResourceRef(entry.path, entry);
      if (!resourceRef || resourceRef.provider !== "gdrive") continue;
      const resourceId = String(resourceRef.resource_id || "").trim();
      if (!resourceId || seenResourceIds.has(resourceId)) continue;
      seenResourceIds.add(resourceId);
      refs.push({
        provider: "gdrive",
        resource_id: resourceId,
      });
    }
    if (refs.length === 0) return;
    try {
      const states = await ctx.invoke("gdrive_get_edit_workcopy_states", { resourceRefs: refs });
      const handled = new Set();
      for (const state of Array.isArray(states) ? states : []) {
        const resourceId = String(state?.resourceId || "").trim();
        if (!resourceId) continue;
        const resourceRef = { provider: "gdrive", resource_id: resourceId };
        const key = gdriveWorkcopyKey(resourceRef);
        if (!key) continue;
        handled.add(key);
        updateCachedWorkcopyFromState(resourceRef, state);
      }
      for (const ref of refs) {
        const key = gdriveWorkcopyKey(ref);
        if (!key || handled.has(key)) continue;
        gdriveWorkcopyMap.delete(key);
      }
    } catch {
      // Ignore refresh failures and keep best-effort cache state.
    }
  }

  /**
   * @param {import("$lib/types").Entry | null | undefined} entry
   * @returns {"" | "local" | "dirty"}
   */
  function resolveGdriveWorkcopyBadge(entry) {
    if (!entry || entry.type !== "file") return "";
    const resourceRef = resolveResourceRef(entry.path, entry);
    const key = gdriveWorkcopyKey(resourceRef);
    if (!key) return "";
    const cached = gdriveWorkcopyMap.get(key);
    if (!cached) return "";
    return cached.dirty ? "dirty" : "local";
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
    const resourceRef = resolveResourceRef(entry.path, entry);
    const targetPath =
      entry.type === "dir"
        ? entry.path
        : currentPath || entry.path;
    try {
      let effectivePath = targetPath;
      if (entry.type === "file") {
        effectivePath = await resolveAssociatedOpenPath(targetPath, resourceRef, entry.name || "");
      }
      const args = buildExternalArgs(app.args || [], effectivePath, currentPath || "");
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

  /**
   * @param {string} path
   * @param {import("$lib/types").ResourceRef | null} resourceRef
   * @param {string} displayName
   */
  async function resolveAssociatedOpenPath(path, resourceRef = null, displayName = "") {
    if (!resourceRef || resourceRef.provider !== "gdrive") {
      return path;
    }
    const workcopy = await ctx.invoke("gdrive_prepare_edit_workcopy", { resourceRef });
    const localPath = String(workcopy?.localPath || "").trim();
    if (!localPath) {
      throw new Error("gdrive edit workcopy path is empty");
    }
    const name = String(workcopy?.fileName || displayName || "").trim() || "file";
    const key = gdriveWorkcopyKey(resourceRef);
    if (key) {
      gdriveWorkcopyMap.set(key, {
        resourceRef: normalizeCachedResourceRef(resourceRef),
        localPath,
        fileName: name,
        revision: workcopy?.revision || null,
        dirty: false,
      });
    }
    setStatusMessage(
      ctx.t("status.gdrive_workcopy_opened", { name }),
      STATUS_LONG_MS
    );
    return localPath;
  }

  /**
   * @param {import("$lib/types").Entry | null} entry
   */
  async function syncGdriveWorkcopyForEntry(entry) {
    if (!entry || entry.type !== "file") {
      setStatusMessage(ctx.t("status.no_selection"), STATUS_SHORT_MS);
      return;
    }
    const resourceRef = resolveResourceRef(entry.path, entry);
    if (!resourceRef || resourceRef.provider !== "gdrive") {
      setStatusMessage(ctx.t("status.gdrive_writeback_only"), STATUS_LONG_MS);
      return;
    }
    const key = gdriveWorkcopyKey(resourceRef);
    let cached = key ? gdriveWorkcopyMap.get(key) : null;
    if (!cached || !cached.localPath || !cached.revision) {
      try {
        cached = await loadCachedWorkcopyFromBackend(resourceRef);
      } catch {
        cached = null;
      }
    }
    if (!cached || !cached.localPath || !cached.revision) {
      if (key) {
        gdriveWorkcopyMap.delete(key);
      }
      setStatusMessage(
        ctx.t("status.gdrive_workcopy_missing", { name: entry.name || "file" }),
        STATUS_LONG_MS
      );
      return;
    }
    try {
      const result = await ctx.invoke("gdrive_apply_edit_workcopy", {
        resourceRef,
        localPath: cached.localPath,
        baseRevision: cached.revision,
      });
      const nextRevision = result?.revision || null;
      if (nextRevision) {
        cached.revision = nextRevision;
      }
      if (result?.conflict) {
        cached.dirty = true;
        setStatusMessage(
          ctx.t("status.gdrive_writeback_conflict", { name: cached.fileName || entry.name || "file" }),
          STATUS_LONG_MS
        );
        return;
      }
      if (result?.unchanged) {
        cached.dirty = false;
        setStatusMessage(
          ctx.t("status.gdrive_writeback_no_change", { name: cached.fileName || entry.name || "file" }),
          STATUS_SHORT_MS
        );
        return;
      }
      if (result?.uploaded) {
        cached.dirty = false;
        setStatusMessage(
          ctx.t("status.gdrive_writeback_done", { name: cached.fileName || entry.name || "file" }),
          STATUS_LONG_MS
        );
        return;
      }
      setStatusMessage(
        ctx.t("status.gdrive_writeback_unknown", { name: cached.fileName || entry.name || "file" }),
        STATUS_LONG_MS
      );
      await refreshGdriveWorkcopyBadges([entry]);
    } catch (err) {
      showError(err);
    }
  }

  /**
   * @param {string} path
   * @param {import("$lib/types").ResourceRef | null} resourceRef
   * @param {string} displayName
   */
  async function openAssociatedApp(path, resourceRef = null, displayName = "") {
    const openPath = await resolveAssociatedOpenPath(path, resourceRef, displayName);
    await ctx.openPath(openPath);
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
      await openAssociatedApp(entry.path, resourceRef, entry.name || "");
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
    resolveGdriveWorkcopyBadge,
    refreshGdriveWorkcopyBadges,
    runExternalApp,
    syncGdriveWorkcopyForEntry,
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

