import { getParentPath } from "$lib/utils/path";

/**
 * @param {object} ctx
 * @param {() => import("$lib/types").Entry[]} ctx.getEntries
 * @param {() => string[]} ctx.getSelectedPaths
 * @param {(value: string[]) => void} ctx.setSelected
 * @param {(value: number | null) => void} ctx.setAnchorIndex
 * @param {(value: string[]) => void} ctx.setDeleteTargets
 * @param {(value: boolean) => void} ctx.setDeleteConfirmOpen
 * @param {(value: number) => void} ctx.setDeleteConfirmIndex
 * @param {(value: string) => void} ctx.setDeleteError
 * @param {(path: string) => Promise<void>} ctx.loadDir
 * @param {(path: string) => void} ctx.openProperties
 * @param {() => string} ctx.getCurrentPath
 * @param {(key: string, vars?: Record<string, string | number>) => string} ctx.t
 * @param {() => import("$lib/types").ProviderCapabilities | null} [ctx.getCurrentPathCapabilities]
 * @param {() => boolean} ctx.getContextMenuCanPaste
 * @param {() => "blank" | "item"} ctx.getContextMenuMode
 * @param {() => { paths: string[], cut: boolean }} ctx.getLastClipboard
 * @param {(value: boolean) => void} ctx.setContextMenuCanPaste
 * @param {object} actions
 * @param {(kind: "file" | "folder") => void} actions.openCreate
 * @param {(entry: import("$lib/types").Entry) => void} actions.openEntry
 * @param {() => void} actions.openInExplorer
 * @param {() => void} actions.openInCmd
 * @param {() => void} actions.openInVSCode
 * @param {() => void} actions.openInGitClient
 * @param {() => void} actions.openZipCreate
 * @param {() => void} actions.openZipExtract
 * @param {(entry: import("$lib/types").Entry) => void} actions.openRename
 * @param {() => void} actions.copySelected
 * @param {() => void} actions.duplicateSelected
 * @param {() => void} actions.prefixDateSelected
 * @param {() => void} actions.cutSelected
 * @param {() => Promise<void>} actions.pasteItems
 * @param {(message: string, durationMs?: number) => void} actions.setStatusMessage
 * @param {(err: unknown) => void} actions.showError
 * @param {(app: import("$lib/types").ExternalAppConfig, entry: import("$lib/types").Entry | null) => void} actions.runExternalApp
 * @param {() => import("$lib/types").ExternalAppConfig[]} actions.getExternalApps
 * @param {() => void} closeContextMenu
 */
export function createContextMenuItems(ctx, actions, closeContextMenu) {
  const {
    openCreate,
    openEntry,
    openInExplorer,
    openInCmd,
    openInVSCode,
    openInGitClient,
    openZipCreate,
    openZipExtract,
    openRename,
    copySelected,
    duplicateSelected,
    prefixDateSelected,
    cutSelected,
    pasteItems,
    setStatusMessage,
    showError,
    runExternalApp,
    getExternalApps,
  } = actions;

  function onContextOpen() {
    const selected = ctx.getSelectedPaths();
    if (selected.length !== 1) return;
    const target = ctx.getEntries().find((e) => e.path === selected[0]);
    if (!target) return;
    openEntry(target);
    closeContextMenu();
  }

  function onContextOpenExplorer() {
    openInExplorer();
    closeContextMenu();
  }

  function onContextOpenCmd() {
    openInCmd();
    closeContextMenu();
  }

  function onContextOpenVSCode() {
    openInVSCode();
    closeContextMenu();
  }

  function onContextOpenGitClient() {
    openInGitClient();
    closeContextMenu();
  }

  /** @param {import("$lib/types").ExternalAppConfig} app */
  function onContextOpenExternalApp(app) {
    const selected = ctx.getSelectedPaths();
    if (selected.length !== 1) return;
    const target = ctx.getEntries().find((e) => e.path === selected[0]);
    if (!target || target.type === "dir") {
      showError?.(ctx.t("error.no_associated_app"));
      closeContextMenu();
      return;
    }
    runExternalApp(app, target);
    closeContextMenu();
  }

  function onContextOpenParent() {
    const selected = ctx.getSelectedPaths();
    if (!selected.length) return;
    if (selected.length === 1) {
      const parent = getParentPath(selected[0]);
      if (parent) ctx.loadDir(parent);
      closeContextMenu();
      return;
    }
    const parent = getParentPath(ctx.getCurrentPath());
    if (parent) ctx.loadDir(parent);
    closeContextMenu();
  }

  function onContextCopy() {
    if (!ctx.getSelectedPaths().length) {
      setStatusMessage?.(ctx.t("status.no_selection"));
      closeContextMenu();
      return;
    }
    copySelected();
    closeContextMenu();
  }

  function onContextDuplicate() {
    if (!ctx.getSelectedPaths().length) {
      setStatusMessage?.(ctx.t("status.no_selection"));
      closeContextMenu();
      return;
    }
    duplicateSelected();
    closeContextMenu();
  }

  function onContextPrefixDate() {
    if (!ctx.getSelectedPaths().length) {
      setStatusMessage?.(ctx.t("status.no_selection"));
      closeContextMenu();
      return;
    }
    prefixDateSelected();
    closeContextMenu();
  }

  function onContextCut() {
    if (!ctx.getSelectedPaths().length) {
      setStatusMessage?.(ctx.t("status.no_selection"));
      closeContextMenu();
      return;
    }
    cutSelected();
    closeContextMenu();
  }

  async function onContextPaste() {
    if (!ctx.getContextMenuCanPaste()) return;
    await pasteItems();
    closeContextMenu();
  }

  function onContextDelete() {
    const selected = ctx.getSelectedPaths();
    if (!selected.length) {
      setStatusMessage?.(ctx.t("status.no_selection"));
      closeContextMenu();
      return;
    }
    ctx.setDeleteTargets([...selected]);
    ctx.setDeleteConfirmOpen(true);
    ctx.setDeleteConfirmIndex(1);
    ctx.setDeleteError("");
    closeContextMenu();
  }

  function onContextRename() {
    const selected = ctx.getSelectedPaths();
    if (selected.length !== 1) {
      setStatusMessage?.(ctx.t("status.no_selection"));
      closeContextMenu();
      return;
    }
    const entry = ctx.getEntries().find((e) => e.path === selected[0]);
    if (!entry) return;
    closeContextMenu();
    openRename(entry);
  }

  function onContextProperties() {
    const selected = ctx.getSelectedPaths();
    if (!selected.length) {
      setStatusMessage?.(ctx.t("status.no_selection"));
      closeContextMenu();
      return;
    }
    ctx.openProperties(selected[0]);
    closeContextMenu();
  }

  function getContextMenuItems() {
    const selected = ctx.getSelectedPaths();
    const entries = ctx.getEntries();
    const hasSelection = selected.length > 0;
    const isSingle = selected.length === 1;
    const selectedEntries = selected
      .map((path) => entries.find((entry) => entry.path === path))
      .filter(Boolean);
    const hasAllSelectedEntries = selectedEntries.length === selected.length;
    const capabilityReason = ctx.t("capability.not_available");
    const currentPathCaps =
      typeof ctx.getCurrentPathCapabilities === "function"
        ? ctx.getCurrentPathCapabilities()
        : null;
    const currentPathSupports = (capabilityKey) =>
      Boolean(currentPathCaps?.[capabilityKey] ?? true);
    const canCreateInCurrentPath = currentPathSupports("can_create");
    const canPasteIntoCurrentPath =
      currentPathSupports("can_copy") || currentPathSupports("can_move");
    const allSelectedSupport = (capabilityKey) =>
      hasSelection &&
      hasAllSelectedEntries &&
      selectedEntries.every((entry) => Boolean(entry?.capabilities?.[capabilityKey] ?? true));
    const singleSupports = (entry, capabilityKey) =>
      !!entry && Boolean(entry?.capabilities?.[capabilityKey] ?? true);
    const clipboard = ctx.getLastClipboard ? ctx.getLastClipboard() : { paths: [] };
    const canPaste = canPasteIntoCurrentPath && ctx.getContextMenuCanPaste();
    const pasteReason = !canPasteIntoCurrentPath
      ? capabilityReason
      : canPaste
        ? ""
        : clipboard?.paths?.length
          ? ctx.t("paste.nothing")
          : ctx.t("paste.empty_clipboard");
    if (ctx.getContextMenuMode() === "blank") {
      return normalizeMenuItems([
        {
          label: ctx.t("context.new"),
          enabled: canCreateInCurrentPath,
          reason: canCreateInCurrentPath ? "" : capabilityReason,
          visible: true,
          action: () => {
            closeContextMenu();
            openCreate("file");
          },
        },
        { label: "-", enabled: false },
        {
          label: ctx.t("context.paste"),
          enabled: canPaste,
          reason: pasteReason,
          visible: true,
          action: onContextPaste,
        },
      ]);
    }
    const openParentEnabled =
      hasSelection &&
      (isSingle
        ? !!getParentPath(selected[0])
        : !!getParentPath(ctx.getCurrentPath()));
    const selectedEntry = isSingle ? entries.find((e) => e.path === selected[0]) : null;
    const isZip = !!selectedEntry && selectedEntry.ext?.toLowerCase() === ".zip";
    const canCopySelection = allSelectedSupport("can_copy");
    const canMoveSelection = allSelectedSupport("can_move");
    const canDeleteSelection = allSelectedSupport("can_delete");
    const canArchiveCreateSelection = allSelectedSupport("can_archive_create");
    const canRenameSingle = isSingle && singleSupports(selectedEntry, "can_rename");
    const canExtractZip = isZip && singleSupports(selectedEntry, "can_archive_extract");
    const extApps = getExternalApps ? getExternalApps() : [];
    return normalizeMenuItems([
      {
        label: ctx.t("context.open"),
        enabled: isSingle,
        visible: isSingle,
        action: onContextOpen,
      },
      {
        label: ctx.t("context.open_explorer"),
        enabled: isSingle,
        visible: isSingle,
        action: onContextOpenExplorer,
      },
      {
        label: ctx.t("context.open_cmd"),
        enabled: isSingle,
        visible: isSingle,
        action: onContextOpenCmd,
      },
      {
        label: ctx.t("context.open_vscode"),
        enabled: isSingle,
        visible: isSingle,
        action: onContextOpenVSCode,
      },
      {
        label: ctx.t("context.open_git_client"),
        enabled: isSingle,
        visible: isSingle,
        action: onContextOpenGitClient,
      },
      ...extApps.map((app) => ({
        label: app.name,
        enabled: isSingle,
        visible: isSingle && !!selectedEntry && selectedEntry.type !== "dir",
        action: () => onContextOpenExternalApp(app),
      })),
      {
        label: ctx.t("context.open_parent"),
        enabled: openParentEnabled,
        visible: openParentEnabled,
        action: onContextOpenParent,
      },
      { label: "-", enabled: false },
      {
        label: ctx.t("context.copy"),
        enabled: canCopySelection,
        reason: hasSelection && !canCopySelection ? capabilityReason : "",
        visible: hasSelection,
        action: onContextCopy,
      },
      {
        label: ctx.t("context.duplicate"),
        enabled: canCopySelection,
        reason: hasSelection && !canCopySelection ? capabilityReason : "",
        visible: hasSelection,
        action: onContextDuplicate,
      },
      {
        label: ctx.t("context.prefix_date"),
        enabled: allSelectedSupport("can_rename"),
        reason: hasSelection && !allSelectedSupport("can_rename") ? capabilityReason : "",
        visible: hasSelection,
        action: onContextPrefixDate,
      },
      {
        label: ctx.t("context.cut"),
        enabled: canMoveSelection,
        reason: hasSelection && !canMoveSelection ? capabilityReason : "",
        visible: hasSelection,
        action: onContextCut,
      },
      {
        label: ctx.t("context.paste"),
        enabled: canPaste,
        reason: pasteReason,
        visible: true,
        action: onContextPaste,
      },
      { label: "-", enabled: false },
      {
        label: ctx.t("context.delete"),
        enabled: canDeleteSelection,
        reason: hasSelection && !canDeleteSelection ? capabilityReason : "",
        visible: hasSelection,
        action: onContextDelete,
      },
      {
        label: ctx.t("context.rename"),
        enabled: canRenameSingle,
        reason: isSingle && !canRenameSingle ? capabilityReason : "",
        visible: isSingle,
        action: onContextRename,
      },
      {
        label: ctx.t("context.properties"),
        enabled: hasSelection,
        visible: hasSelection,
        action: onContextProperties,
      },
      { label: "-", enabled: false },
      {
        label: ctx.t("context.compress"),
        enabled: canArchiveCreateSelection,
        reason: hasSelection && !canArchiveCreateSelection ? capabilityReason : "",
        visible: hasSelection,
        action: openZipCreate,
      },
      {
        label: ctx.t("context.extract"),
        enabled: canExtractZip,
        reason: isZip && !canExtractZip ? capabilityReason : "",
        visible: isZip,
        action: openZipExtract,
      },
    ]);
  }

  return { getContextMenuItems, onContextDelete, onContextProperties };
}

/**
 * @param {Array<{ label?: string, enabled?: boolean, visible?: boolean }>} items
 */
function normalizeMenuItems(items) {
  const visibleItems = items.filter((item) => item.visible !== false);
  const normalized = [];
  for (const item of visibleItems) {
    if (item.label === "-") {
      if (normalized.length === 0) continue;
      if (normalized[normalized.length - 1]?.label === "-") continue;
    }
    normalized.push(item);
  }
  while (normalized.length > 0 && normalized[normalized.length - 1]?.label === "-") {
    normalized.pop();
  }
  return normalized;
}
