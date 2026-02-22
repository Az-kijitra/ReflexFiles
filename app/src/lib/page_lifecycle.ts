/**
 * @param {object} ctx
 * @param {() => Promise<string>} ctx.homeDir
 * @param {(command: string, payload?: Record<string, unknown>) => Promise<any>} ctx.invoke
 * @param {(eventName: string, handler: (event: any) => void) => Promise<() => void>} ctx.listen
 * @param {string} ctx.EVENT_FS_CHANGED
 * @param {string} ctx.EVENT_OP_PROGRESS
 * @param {(message: string, durationMs?: number) => void} ctx.setStatusMessage
 * @param {(err: unknown) => void} ctx.showError
 * @param {(path: string) => Promise<void>} ctx.loadDir
 * @param {() => string} ctx.getCurrentPath
 * @param {() => ReturnType<typeof setTimeout> | null} ctx.getWatchRefreshTimer
 * @param {(value: ReturnType<typeof setTimeout> | null) => void} ctx.setWatchRefreshTimer
 * @param {(value: number) => void} ctx.setDirStatsTimeoutMs
 * @param {(value: boolean) => void} ctx.setShowHidden
 * @param {(value: boolean) => void} ctx.setShowSize
 * @param {(value: boolean) => void} ctx.setShowTime
 * @param {(value: boolean) => void} ctx.setShowTree
 * @param {(value: string) => void} ctx.setSortKey
 * @param {(value: string) => void} ctx.setSortOrder
 * @param {(value: "light" | "dark") => void} ctx.setUiTheme
 * @param {(value: "en" | "ja") => void} ctx.setUiLanguage
 * @param {(value: "by_type" | "simple" | "none") => void} ctx.setUiFileIconMode
 * @param {(value: "windows" | "vim") => void} ctx.setKeymapProfile
 * @param {(value: Record<string, string>) => void} ctx.setExternalAppAssociations
 * @param {(value: import("$lib/types").ExternalAppConfig[]) => void} ctx.setExternalApps
 * @param {(value: Record<string, string>) => void} ctx.setKeymapCustom
 * @param {(value: boolean) => void} ctx.setLoggingEnabled
 * @param {(value: string) => void} ctx.setLogFile
 * @param {(value: string[]) => void} ctx.setPathHistory
 * @param {(value: import("$lib/types").JumpItem[]) => void} ctx.setJumpList
 * @param {(value: string[]) => void} ctx.setSearchHistory
 * @param {() => Promise<void>} ctx.updateWindowBounds
 * @param {(value: boolean) => void} ctx.setUiConfigLoaded
 * @param {() => import("@tauri-apps/api/window").Window} ctx.getCurrentWindow
 * @param {(value: { x: number, y: number, width: number, height: number, maximized: boolean }) => void} ctx.setWindowBounds
 * @param {(value: boolean) => void} ctx.setWindowBoundsReady
 * @param {() => void} ctx.scheduleUiSave
 * @param {() => void} ctx.onBeforeUnload
 * @param {(event: KeyboardEvent) => void} ctx.onKeyDown
 * @param {(event: MouseEvent) => void} ctx.onClick
 * @param {() => void} ctx.recomputeStatusItems
 * @param {(value: () => Promise<void>) => void} ctx.setUpdateWindowBounds
 * @param {(key: string, vars?: Record<string, string | number>) => string} ctx.t
 */
export async function setupPageLifecycle(ctx) {
  const home = await ctx.homeDir();
  let config = null;
  try {
    config = await ctx.invoke("config_get_startup");
    if (config?.perf_dir_stats_timeout_ms) {
      ctx.setDirStatsTimeoutMs(config.perf_dir_stats_timeout_ms);
    }
    if (config?.ui_show_hidden !== undefined) {
      ctx.setShowHidden(config.ui_show_hidden);
    }
    if (config?.ui_show_size !== undefined) {
      ctx.setShowSize(config.ui_show_size);
    }
    if (config?.ui_show_time !== undefined) {
      ctx.setShowTime(config.ui_show_time);
    }
    if (config?.ui_show_tree !== undefined) {
      ctx.setShowTree(config.ui_show_tree);
    }
    const viewSortKey =
      config?.view_sort_key ?? config?.viewSortKey ?? config?.sort_key ?? config?.sortKey;
    if (viewSortKey) {
      ctx.setSortKey(viewSortKey);
    }
    const viewSortOrder =
      config?.view_sort_order ?? config?.viewSortOrder ?? config?.sort_order ?? config?.sortOrder;
    if (viewSortOrder) {
      ctx.setSortOrder(viewSortOrder);
    }
    if (config?.ui_theme) {
      ctx.setUiTheme(config.ui_theme);
    }
    if (config?.ui_language) {
      ctx.setUiLanguage(config.ui_language);
    }
    if (config?.ui_file_icon_mode) {
      ctx.setUiFileIconMode(config.ui_file_icon_mode);
    }
    if (config?.input_keymap_profile) {
      ctx.setKeymapProfile(config.input_keymap_profile);
    }
    if (config?.external_associations && typeof config.external_associations === "object") {
      ctx.setExternalAppAssociations(config.external_associations);
    }
    if (Array.isArray(config?.external_apps)) {
      ctx.setExternalApps(config.external_apps);
    }
    if (config?.input_keymap_custom && typeof config.input_keymap_custom === "object") {
      ctx.setKeymapCustom(config.input_keymap_custom);
    }
    if (config?.log_enabled !== undefined) {
      ctx.setLoggingEnabled(config.log_enabled);
    }
    if (config?.log_path) {
      ctx.setLogFile(config.log_path);
    }
    if (Array.isArray(config?.history_paths)) {
      ctx.setPathHistory(config.history_paths);
    }
    if (Array.isArray(config?.history_jump_list)) {
      ctx.setJumpList(config.history_jump_list);
    }
    if (Array.isArray(config?.history_search)) {
      ctx.setSearchHistory(config.history_search);
    }
    await ctx.updateWindowBounds();
    ctx.setUiConfigLoaded(true);
  } catch (err) {
    ctx.showError(err);
    ctx.setUiConfigLoaded(true);
  }

  const initialPath = config?.session_last_path || home || "C:\\";
  await ctx.loadDir(initialPath);

  const unlistenFsChanged = await ctx.listen(ctx.EVENT_FS_CHANGED, (event) => {
    if (!event?.payload) return;
    const changed = String(event.payload);
    const currentPath = ctx.getCurrentPath();
    if (!currentPath) return;
    if (
      changed === currentPath ||
      changed.startsWith(currentPath + "\\") ||
      currentPath.startsWith(changed + "\\")
    ) {
      const existing = ctx.getWatchRefreshTimer();
      if (existing) {
        clearTimeout(existing);
      }
      const timer = setTimeout(() => {
        ctx.loadDir(currentPath);
      }, 300);
      ctx.setWatchRefreshTimer(timer);
    }
  });

  const unlistenOpProgress = await ctx.listen(ctx.EVENT_OP_PROGRESS, (event) => {
    if (!event?.payload) return;
    const payload = event.payload;
    const name =
      payload?.path?.split?.(/[\\\/]/)?.pop?.() || payload?.path || "item";
    const index = payload?.index ?? 0;
    const total = payload?.total ?? 0;
    const label = payload?.op === "move" ? ctx.t("status.moving") : ctx.t("status.copying");
    const status = payload?.status || "";
    if (status === "start") {
      ctx.setStatusMessage(`${label} ${name} (${index}/${total})`, 3000);
    }
    if (status === "fail") {
      const reason = payload?.error ? `: ${payload.error}` : "";
      ctx.setStatusMessage(ctx.t("status.failed", { name, reason }), 4000);
    }
    if (status === "done") {
      ctx.setStatusMessage(ctx.t("status.done", { label, name, index, total }), 1500);
    }
  });

  const onWindowKeydownCapture = (event) => {
    if ((import.meta as any)?.env?.DEV) {
      const ctrl = !!(event.ctrlKey || event.getModifierState?.("Control"));
      const alt = !!(event.altKey || event.getModifierState?.("Alt"));
      const shift = !!(event.shiftKey || event.getModifierState?.("Shift"));
      const meta = !!(event.metaKey || event.getModifierState?.("Meta"));
      const code = String(event.code || "");
      const key = String(event.key || "");
      const keyLower = key.toLowerCase();
      const isTargetCode =
        code === "F2" ||
        code === "KeyF" ||
        code === "KeyZ" ||
        code === "KeyX" ||
        keyLower === "f2" ||
        keyLower === "f" ||
        keyLower === "z" ||
        keyLower === "x";
      const isTarget =
        isTargetCode ||
        (!ctrl && !alt && !meta && code === "F2") ||
        (ctrl && !alt && !meta && (code === "KeyF" || keyLower === "f")) ||
        (ctrl && alt && !meta && !shift && (code === "KeyZ" || keyLower === "z")) ||
        (ctrl && alt && !meta && !shift && (code === "KeyX" || keyLower === "x"));
      if (isTarget) {
        const active = document.activeElement;
        const activeTag = active?.tagName || "-";
        ctx.setStatusMessage(
          `DBG L0 key=${key} code=${code} c=${ctrl ? 1 : 0} a=${alt ? 1 : 0} s=${shift ? 1 : 0} m=${meta ? 1 : 0} active=${activeTag}`,
          5000
        );
      }
    }
    ctx.onKeyDown(event);
  };
  window.addEventListener("keydown", onWindowKeydownCapture, { capture: true });
  window.addEventListener("click", ctx.onClick, { capture: true });
  window.addEventListener("beforeunload", ctx.onBeforeUnload);
  const onFocusIn = () => {
    ctx.recomputeStatusItems?.();
  };
  window.addEventListener("focusin", onFocusIn, { capture: true });

  const win = ctx.getCurrentWindow();
  const updateWindowBounds = async () => {
    try {
      const [pos, size, maximized] = await Promise.all([
        win.outerPosition(),
        win.innerSize(),
        win.isMaximized(),
      ]);
      ctx.setWindowBounds({
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
        maximized,
      });
      const ready = size.width > 0 && size.height > 0;
      ctx.setWindowBoundsReady(ready);
      if (ready) {
        ctx.scheduleUiSave();
      }
    } catch {
      // ignore
    }
  };
  ctx.setUpdateWindowBounds(updateWindowBounds);
  await updateWindowBounds();
  const unlistenMove = await win.onMoved(() => updateWindowBounds());
  const unlistenResize = await win.onResized(() => updateWindowBounds());

  return () => {
    if (unlistenFsChanged) {
      unlistenFsChanged();
    }
    if (unlistenOpProgress) {
      unlistenOpProgress();
    }
    ctx.invoke("fs_watch_stop").catch(() => {});
    window.removeEventListener("keydown", onWindowKeydownCapture, { capture: true });
    window.removeEventListener("click", ctx.onClick, { capture: true });
    window.removeEventListener("beforeunload", ctx.onBeforeUnload);
    window.removeEventListener("focusin", onFocusIn, { capture: true });
    unlistenMove();
    unlistenResize();
  };
}
