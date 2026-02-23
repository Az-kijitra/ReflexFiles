import {
  buildClipboardFeature,
  buildContextMenuFeature,
  buildDeleteFeature,
  buildEditFeature,
  buildExternalFeature,
  buildFeedbackFeature,
  buildFileOpsFeature,
  buildHistoryFeature,
  buildSelectionFeature,
  buildUndoFeature,
} from "$lib/page_actions_registry_feature_builders";
import {
  endNativeOutboundDrag,
  evaluateOutboundAppDragCandidate,
  markNativeOutboundDragSuppress,
  NATIVE_OUTBOUND_DND_SUPPRESS_COOLDOWN_MS,
  NATIVE_OUTBOUND_DND_SUPPRESS_START_MS,
  readDragDropExperimentPolicyFromStorage,
  tryBeginNativeOutboundDrag,
} from "$lib/utils/drag_drop_experiment";
import type { PageActionsRegistryContext } from "$lib/page_actions_registry_features_types";

export function buildPageActionsFeatures(ctx: PageActionsRegistryContext) {
  const {
    setStatusMessage,
    showError,
    showFailures,
    failureMessage,
    closeFailureModal,
  } = buildFeedbackFeature(ctx);

  const { pushUndoEntry, performUndo, performRedo } = buildUndoFeature(ctx, {
    setStatusMessage,
    showError,
    showFailures,
  });

  const {
    confirmPasteOverwrite,
    confirmPasteSkip,
    confirmPasteKeepBoth,
    cancelPasteConfirm,
    copySelected,
    cutSelected,
    pasteItems,
    runPaste,
  } = buildClipboardFeature(ctx, {
    setStatusMessage,
    showError,
    showFailures,
    pushUndoEntry,
  });

  const {
    isSelected,
    setSelected,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    invertSelection,
  } = buildSelectionFeature(ctx);

  const {
    addJumpCurrent,
    addJumpUrl,
    openJumpUrlModal,
    confirmJumpUrl,
    cancelJumpUrl,
    applySearch,
    clearSearch,
    onSearchKeydown,
    scrollDropdownToIndex,
    removeJump,
    removeHistory,
    selectDropdown,
  } = buildHistoryFeature(ctx, { setStatusMessage });

  const {
    getExternalApps,
    getTargetEntry,
    resolveGdriveWorkcopyBadge,
    refreshGdriveWorkcopyBadges,
    runExternalApp,
    openEntry,
    syncGdriveWorkcopyForEntry,
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
  } = buildExternalFeature(ctx, { setStatusMessage, showError });

  const {
    openRename,
    confirmRename,
    cancelRename,
    openCreate,
    confirmCreate,
    cancelCreate,
  } = buildEditFeature(ctx, { setStatusMessage, showError, pushUndoEntry });

  const { confirmDelete, cancelDelete } = buildDeleteFeature(ctx, {
    setStatusMessage,
    showError,
    pushUndoEntry,
  });

  const { duplicateSelected, prefixDateSelected } = buildFileOpsFeature(ctx, {
    setStatusMessage,
    showError,
    showFailures,
    pushUndoEntry,
  });

  const startExplorerDragExperimental = async () => {
    const entries = ctx.getEntries();
    const selectedPaths = ctx.getSelectedPaths();
    const focusedIndex = ctx.getFocusedIndex();
    const selectedEntries =
      Array.isArray(selectedPaths) && selectedPaths.length > 0
        ? selectedPaths
            .map((path) => entries.find((entry) => entry?.path === path))
            .filter((entry) => Boolean(entry))
        : [];
    const operationEntries =
      selectedEntries.length > 0
        ? selectedEntries
        : focusedIndex >= 0 && focusedIndex < entries.length && entries[focusedIndex]
          ? [entries[focusedIndex]]
          : [];
    const policy =
      typeof window !== "undefined" && typeof window.localStorage !== "undefined"
        ? readDragDropExperimentPolicyFromStorage((key) => window.localStorage.getItem(key))
        : null;
    const decision = evaluateOutboundAppDragCandidate({
      policy,
      selectedEntries: operationEntries.map((entry: any) => ({
        path: String(entry?.path || ""),
        provider: entry?.provider ?? entry?.ref?.provider ?? "local",
      })),
    });
    const dndExportReasonLabel = (reason: string) => {
      switch (String(reason || "")) {
        case "disabled":
        case "phase_not_supported":
          return ctx.t("dnd.export_experimental_disabled");
        case "no_items":
          return ctx.t("status.no_selection");
        case "source_not_local":
          return ctx.t("dnd.export_local_only");
        case "mixed_or_invalid_sources":
          return ctx.t("dnd.export_mixed_selection_not_supported");
        default:
          return ctx.t("capability.not_available");
      }
    };
    if (!decision.allowed) {
      setStatusMessage(
        ctx.t("status.dnd_export_blocked", { reason: dndExportReasonLabel(decision.reason) }),
        3500,
      );
      return;
    }
    setStatusMessage(
      ctx.t("status.dnd_export_native_ready", { count: decision.acceptedPaths.length }),
      6000,
    );
    try {
      if (typeof window !== "undefined") {
        const dragWin = window as Window & {
          __rf_native_outbound_drag_suppress_until?: number;
          __rf_native_outbound_drag_inflight?: boolean;
        };
        if (!tryBeginNativeOutboundDrag(dragWin)) {
          setStatusMessage(ctx.t("status.dnd_export_native_busy"), 2500);
          return;
        }
        markNativeOutboundDragSuppress(
          dragWin,
          NATIVE_OUTBOUND_DND_SUPPRESS_START_MS
        );
      }
      const result = await ctx.invoke("shell_start_file_drag_debug", {
        paths: decision.acceptedPaths,
      });
      const resultText = String(result || "");
      if (resultText === "none") {
        setStatusMessage(ctx.t("status.dnd_export_native_canceled"), 3000);
      } else {
        setStatusMessage(ctx.t("status.dnd_export_native_finished", { result: resultText }), 4000);
      }
    } catch (err) {
      showError(err);
    } finally {
      if (typeof window !== "undefined") {
        const dragWin = window as Window & {
          __rf_native_outbound_drag_suppress_until?: number;
          __rf_native_outbound_drag_inflight?: boolean;
        };
        endNativeOutboundDrag(dragWin);
        markNativeOutboundDragSuppress(
          dragWin,
          NATIVE_OUTBOUND_DND_SUPPRESS_COOLDOWN_MS
        );
      }
    }
  };

  const { zipActions, contextMenuActions } = buildContextMenuFeature(ctx, {
    openCreate,
    openEntry,
    openInExplorer,
    openInCmd,
    openInTerminalCmd,
    openInTerminalPowerShell,
    openInTerminalWsl,
    openInVSCode,
    openInGitClient,
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
    syncGdriveWorkcopyForEntry,
    startExplorerDragExperimental,
  });
  const { openZipCreate, openZipExtract, runZipAction, closeZipModal } = zipActions;
  const {
    openContextMenu,
    closeContextMenu,
    getSelectableIndex,
    handleContextMenuKey,
    getContextMenuItems,
    onContextDelete,
    onContextProperties,
  } = contextMenuActions;

  const getFocusedEntry = () => {
    const entries = ctx.getEntries();
    const focusedIndex = ctx.getFocusedIndex();
    if (!Array.isArray(entries) || focusedIndex < 0 || focusedIndex >= entries.length) {
      return null;
    }
    return entries[focusedIndex] ?? null;
  };

  const getSelectedEntries = () => {
    const selectedPaths = ctx.getSelectedPaths();
    const entries = ctx.getEntries();
    if (!Array.isArray(selectedPaths) || !selectedPaths.length || !Array.isArray(entries)) {
      return [];
    }
    const byPath = new Map(entries.map((entry) => [entry?.path, entry]));
    return selectedPaths.map((path) => byPath.get(path)).filter((entry) => Boolean(entry));
  };

  const getOperationEntries = () => {
    const selectedEntries = getSelectedEntries();
    if (selectedEntries.length > 0) return selectedEntries;
    const focused = getFocusedEntry();
    return focused ? [focused] : [];
  };

  const supportsCapability = (entry: any, capabilityKey: string) =>
    Boolean(entry?.capabilities?.[capabilityKey] ?? true);

  const allEntriesSupport = (entries: any[], capabilityKey: string) =>
    entries.length > 0 && entries.every((entry) => supportsCapability(entry, capabilityKey));

  const hasOperationTargets = () => getOperationEntries().length > 0;
  const hasSelection = () => {
    const selectedPaths = ctx.getSelectedPaths();
    return Array.isArray(selectedPaths) && selectedPaths.length > 0;
  };
  const getCurrentPathCapabilities = () => {
    const reader = (ctx as any).getCurrentPathCapabilities;
    return typeof reader === "function" ? reader() : null;
  };
  const currentPathSupports = (capabilityKey: string) =>
    Boolean(getCurrentPathCapabilities()?.[capabilityKey] ?? true);
  const canCreateCurrentPath = () => currentPathSupports("can_create");
  const canPasteCurrentPath = () =>
    currentPathSupports("can_copy") || currentPathSupports("can_move");

  const canCopyTargets = () => allEntriesSupport(getOperationEntries(), "can_copy");
  const areOperationEntriesLocal = () =>
    getOperationEntries().every((entry) => {
      const provider = String(entry?.ref?.provider || "").toLowerCase();
      return provider === "local" || !String(entry?.path || "").startsWith("gdrive://");
    });
  const canDuplicateTargets = () => canCopyTargets() && areOperationEntriesLocal();
  const isLocalLikeEntry = (entry: any) => {
    const provider = String(entry?.ref?.provider || "").toLowerCase();
    const path = String(entry?.path || "");
    return provider === "local" || (!provider && !path.startsWith("gdrive://")) || !path.startsWith("gdrive://");
  };
  const canPrefixDateTargets = () => allEntriesSupport(getOperationEntries(), "can_rename");
  const canCutTargets = () => allEntriesSupport(getOperationEntries(), "can_move");
  const canRenameFocused = () => {
    const focused = getFocusedEntry();
    if (!focused) return false;
    if (supportsCapability(focused, "can_rename")) return true;
    // Local items may temporarily carry stale/missing capability flags; let the rename action validate later.
    return isLocalLikeEntry(focused);
  };
  const canDeleteSelection = () => allEntriesSupport(getSelectedEntries(), "can_delete");
  const canOpenPropertiesSelection = () => hasSelection();
  const canZipCreateSelection = () => {
    const selectedEntries = getSelectedEntries();
    if (selectedEntries.length === 0) return false;
    if (allEntriesSupport(selectedEntries, "can_archive_create")) return true;
    return selectedEntries.every((entry) => isLocalLikeEntry(entry));
  };
  const canZipExtractSelection = () => {
    const selectedEntries = getSelectedEntries();
    if (selectedEntries.length !== 1) return false;
    const entry = selectedEntries[0];
    return entry?.ext?.toLowerCase() === ".zip" && supportsCapability(entry, "can_archive_extract");
  };
  const canZipExtractFocused = () => {
    const focused = getFocusedEntry();
    if (!focused || focused.ext?.toLowerCase() !== ".zip") return false;
    if (supportsCapability(focused, "can_archive_extract")) return true;
    return isLocalLikeEntry(focused);
  };

  const canDeleteTargets = () => {
    const focused = getFocusedEntry();
    const selectedPaths = ctx.getSelectedPaths();
    const deleteTargetEntries =
      Array.isArray(selectedPaths) &&
      selectedPaths.length > 0 &&
      focused?.path &&
      selectedPaths.includes(focused.path)
        ? getSelectedEntries()
        : focused
          ? [focused]
          : [];
    return allEntriesSupport(deleteTargetEntries, "can_delete");
  };

  return {
    confirmPasteOverwrite,
    confirmPasteSkip,
    confirmPasteKeepBoth,
    cancelPasteConfirm,
    confirmDelete,
    cancelDelete,
    openRename,
    confirmRename,
    cancelRename,
    openCreate,
    confirmCreate,
    cancelCreate,
    addJumpCurrent,
    addJumpUrl,
    openJumpUrlModal,
    confirmJumpUrl,
    cancelJumpUrl,
    openZipCreate,
    openZipExtract,
    runZipAction,
    closeZipModal,
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
    applySearch,
    clearSearch,
    onSearchKeydown,
    scrollDropdownToIndex,
    removeJump,
    removeHistory,
    selectDropdown,
    setStatusMessage,
    showError,
    showFailures,
    failureMessage,
    closeFailureModal,
    copySelected,
    cutSelected,
    pasteItems,
    runPaste,
    duplicateSelected,
    prefixDateSelected,
    hasOperationTargets,
    hasSelection,
    canCreateCurrentPath,
    canPasteCurrentPath,
    canCopyTargets,
    canDuplicateTargets,
    canPrefixDateTargets,
    canCutTargets,
    canRenameFocused,
    canDeleteSelection,
    canDeleteTargets,
    canOpenPropertiesSelection,
    canZipCreateSelection,
    canZipExtractSelection,
    canZipExtractFocused,
    pushUndoEntry,
    performUndo,
    performRedo,
    isSelected,
    setSelected,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    invertSelection,
    openContextMenu,
    closeContextMenu,
    getSelectableIndex,
    handleContextMenuKey,
    getContextMenuItems,
    onContextDelete,
    onContextProperties,
    getExternalApps,
    resolveGdriveWorkcopyBadge,
    refreshGdriveWorkcopyBadges,
    runExternalApp,
    getTargetEntry,
  };
}

