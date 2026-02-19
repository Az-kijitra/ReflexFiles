/**
 * @param {KeyboardEvent} event
 * @param {object} ctx
 */
export function handleListKey(event, ctx) {
  const active = ctx.activeElement;
  const reportCapabilityUnavailable = () => ctx.setStatusMessage(ctx.t("capability.not_available"));
  const isPlainDeleteKey =
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    (
      event.key === "Delete" ||
      event.key === "Del" ||
      event.key === "\uE017" ||
      event.code === "Delete" ||
      event.keyCode === 46 ||
      event.which === 46
    );
  if (ctx.matchesAction(event, "undo")) {
    event.preventDefault();
    ctx.performUndo();
    return true;
  }
  if (ctx.matchesAction(event, "redo")) {
    event.preventDefault();
    ctx.performRedo();
    return true;
  }
  if (ctx.propertiesOpen && event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    ctx.clearDirStatsCache();
    ctx.setStatusMessage(ctx.t("status.cache_cleared"));
    return true;
  }
  if (
    (event.ctrlKey &&
      (event.key === "Delete" || event.key === "Del" || event.code === "Delete")) ||
    (event.ctrlKey &&
      event.shiftKey &&
      (event.key === "Delete" || event.key === "Del" || event.code === "Delete"))
  ) {
    event.preventDefault();
    if (ctx.confirm(ctx.t("history.clear_confirm"))) {
      ctx.setPathHistory([]);
      ctx.scheduleUiSave();
    }
    return true;
  }
  if (ctx.matchesAction(event, "select_all")) {
    if (ctx.listEl && (active === ctx.listEl || ctx.listEl.contains(active))) {
      event.preventDefault();
      ctx.selectAll();
    }
    return true;
  }
  const isSpace =
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.metaKey &&
    (event.key === " " || event.key === "Spacebar" || event.code === "Space");
  const listActive =
    ctx.listEl && (active === ctx.listEl || (ctx.listEl.contains && ctx.listEl.contains(active)));
  const bodyActive = active === document.body || active === document.documentElement;
  if (isSpace && ctx.listEl && (listActive || bodyActive)) {
    event.preventDefault();
    ctx.toggleSelection(ctx.focusedIndex, true);
    return true;
  }
  if (ctx.matchesAction(event, "clear_selection")) {
    if (ctx.selectedPaths.length > 0) {
      event.preventDefault();
      ctx.setSelected([]);
      ctx.setAnchorIndex(null);
      ctx.setStatusMessage(ctx.t("status.selection_cleared"));
    }
    return true;
  }
  if (ctx.matchesAction(event, "toggle_size")) {
    event.preventDefault();
    ctx.setShowSize(!ctx.showSize);
    ctx.updateListRows();
    ctx.scheduleUiSave();
    return true;
  }
  if (ctx.matchesAction(event, "toggle_time")) {
    event.preventDefault();
    ctx.setShowTime(!ctx.showTime);
    ctx.updateListRows();
    ctx.scheduleUiSave();
    return true;
  }
  if (ctx.matchesAction(event, "toggle_tree")) {
    event.preventDefault();
    const nextShowTree = !ctx.showTree;
    ctx.setShowTree(nextShowTree);
    if (!nextShowTree) {
      const isTreeActive = ctx.treeEl && (active === ctx.treeEl || ctx.treeEl.contains(active));
      if (isTreeActive) {
        ctx.focusList();
      }
    } else {
      ctx.buildTreeRoot(ctx.currentPath).catch((err) => ctx.showError(err));
    }
    requestAnimationFrame(() => ctx.updateListRows());
    ctx.scheduleUiSave();
    return true;
  }
  if (ctx.matchesAction(event, "open_explorer")) {
    event.preventDefault();
    ctx.openInExplorer();
    return true;
  }
  if (ctx.matchesAction(event, "open_cmd")) {
    event.preventDefault();
    ctx.openInCmd();
    return true;
  }
  if (ctx.matchesAction(event, "open_terminal_cmd")) {
    event.preventDefault();
    ctx.openInTerminalCmd();
    return true;
  }
  if (ctx.matchesAction(event, "open_terminal_powershell")) {
    event.preventDefault();
    ctx.openInTerminalPowerShell();
    return true;
  }
  if (ctx.matchesAction(event, "open_terminal_wsl")) {
    event.preventDefault();
    ctx.openInTerminalWsl();
    return true;
  }
  if (ctx.matchesAction(event, "open_vscode")) {
    event.preventDefault();
    ctx.openInVSCode();
    return true;
  }
  if (ctx.matchesAction(event, "open_git_client")) {
    event.preventDefault();
    ctx.openInGitClient();
    return true;
  }
  if (ctx.matchesAction(event, "zip_create")) {
    event.preventDefault();
    if (
      ctx.selectedPaths.length > 0 &&
      typeof ctx.canZipCreateSelection === "function" &&
      !ctx.canZipCreateSelection()
    ) {
      reportCapabilityUnavailable();
      return true;
    }
    ctx.openZipCreate();
    return true;
  }
  if (ctx.matchesAction(event, "zip_extract")) {
    event.preventDefault();
    const entry = ctx.entries[ctx.focusedIndex];
    if (entry && entry.ext?.toLowerCase() === ".zip") {
      if (
        typeof ctx.canZipExtractFocused === "function" &&
        !ctx.canZipExtractFocused()
      ) {
        reportCapabilityUnavailable();
        return true;
      }
      if (ctx.selectedPaths.length !== 1 || ctx.selectedPaths[0] !== entry.path) {
        ctx.setSelected([entry.path]);
        ctx.setAnchorIndex(ctx.focusedIndex);
      }
      ctx.openZipExtract();
    }
    return true;
  }
  if (ctx.matchesAction(event, "focus_path")) {
    event.preventDefault();
    ctx.setSearchActive(false);
    ctx.setDropdownOpen(false);
    ctx.setPathInput(ctx.currentPath);
    ctx.focusPathInput();
    return true;
  }
  if (ctx.matchesAction(event, "toggle_hidden")) {
    event.preventDefault();
    ctx.setShowHidden(!ctx.showHidden);
    ctx.scheduleUiSave();
    ctx.loadDir(ctx.currentPath);
    return true;
  }
  if (ctx.matchesAction(event, "refresh")) {
    event.preventDefault();
    ctx.loadDir(ctx.currentPath);
    return true;
  }
  if (ctx.matchesAction(event, "properties")) {
    event.preventDefault();
    const entry = ctx.entries[ctx.focusedIndex];
    if (entry) {
      ctx.openProperties(entry.path);
    }
    return true;
  }
  if (!ctx.entries.length) {
    if (ctx.matchesAction(event, "paste")) {
      event.preventDefault();
      if (
        typeof ctx.canPasteCurrentPath === "function" &&
        !ctx.canPasteCurrentPath()
      ) {
        reportCapabilityUnavailable();
        return true;
      }
      ctx.pasteItems();
      return true;
    }
    if (ctx.matchesAction(event, "go_parent")) {
      event.preventDefault();
      if (!ctx.currentPath) return true;
      const trimmed = ctx.currentPath.replace(/[\\\/]+$/, "");
      const parent = trimmed.replace(/[\\\/][^\\\/]+$/, "");
      if (parent && parent !== trimmed) {
        ctx.loadDir(parent);
      }
    }
    return true;
  }
  if (ctx.matchesAction(event, "move_down")) {
    event.preventDefault();
    ctx.moveFocusByRow(1, event.shiftKey);
    return true;
  }
  if (ctx.matchesAction(event, "move_up")) {
    event.preventDefault();
    ctx.moveFocusByRow(-1, event.shiftKey);
    return true;
  }
  if (ctx.matchesAction(event, "page_down")) {
    event.preventDefault();
    ctx.moveFocusByRow(ctx.listRows, event.shiftKey);
    return true;
  }
  if (ctx.matchesAction(event, "page_up")) {
    event.preventDefault();
    ctx.moveFocusByRow(-ctx.listRows, event.shiftKey);
    return true;
  }
  if (ctx.matchesAction(event, "move_right")) {
    event.preventDefault();
    ctx.moveFocusByColumn(1, event.shiftKey);
    return true;
  }
  if (ctx.matchesAction(event, "move_left")) {
    event.preventDefault();
    ctx.moveFocusByColumn(-1, event.shiftKey);
    return true;
  }
  if (ctx.matchesAction(event, "select_toggle")) {
    event.preventDefault();
    ctx.toggleSelection(ctx.focusedIndex, true);
    return true;
  }
  const isShiftEnterOpen =
    event.shiftKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey &&
    (event.key === "Enter" || event.code === "Enter" || event.code === "NumpadEnter");
  if (isShiftEnterOpen) {
    event.preventDefault();
    const entry = ctx.entries[ctx.focusedIndex];
    if (!entry) return true;
    ctx.openEntry(entry, { forceAssociatedApp: true });
    return true;
  }
  if (ctx.matchesAction(event, "open")) {
    event.preventDefault();
    const entry = ctx.entries[ctx.focusedIndex];
    if (!entry) return true;
    ctx.openEntry(entry, { forceAssociatedApp: !!event.shiftKey });
    return true;
  }
  if (ctx.matchesAction(event, "rename")) {
    event.preventDefault();
    const entry = ctx.entries[ctx.focusedIndex];
    if (!entry) return true;
    if (typeof ctx.canRenameFocused === "function" && !ctx.canRenameFocused()) {
      reportCapabilityUnavailable();
      return true;
    }
    ctx.openRename(entry);
    return true;
  }
  if (ctx.matchesAction(event, "new_file")) {
    event.preventDefault();
    if (
      typeof ctx.canCreateCurrentPath === "function" &&
      !ctx.canCreateCurrentPath()
    ) {
      reportCapabilityUnavailable();
      return true;
    }
    ctx.openCreate("file");
    return true;
  }
  if (ctx.matchesAction(event, "go_parent")) {
    event.preventDefault();
    if (!ctx.currentPath) return true;
    const trimmed = ctx.currentPath.replace(/[\\\/]+$/, "");
    const parent = trimmed.replace(/[\\\/][^\\\/]+$/, "");
    if (parent && parent !== trimmed) {
      ctx.loadDir(parent);
    }
    return true;
  }
  if (ctx.matchesAction(event, "copy")) {
    event.preventDefault();
    const hasTargets = ctx.selectedPaths.length > 0 || !!ctx.entries[ctx.focusedIndex];
    if (hasTargets && typeof ctx.canCopyTargets === "function" && !ctx.canCopyTargets()) {
      reportCapabilityUnavailable();
      return true;
    }
    ctx.copySelected();
    return true;
  }
  if (ctx.matchesAction(event, "duplicate")) {
    event.preventDefault();
    const hasTargets = ctx.selectedPaths.length > 0 || !!ctx.entries[ctx.focusedIndex];
    if (
      hasTargets &&
      typeof ctx.canDuplicateTargets === "function" &&
      !ctx.canDuplicateTargets()
    ) {
      reportCapabilityUnavailable();
      return true;
    }
    ctx.duplicateSelected();
    return true;
  }
  if (ctx.matchesAction(event, "prefix_date")) {
    event.preventDefault();
    const hasTargets = ctx.selectedPaths.length > 0 || !!ctx.entries[ctx.focusedIndex];
    if (
      hasTargets &&
      typeof ctx.canPrefixDateTargets === "function" &&
      !ctx.canPrefixDateTargets()
    ) {
      reportCapabilityUnavailable();
      return true;
    }
    ctx.prefixDateSelected();
    return true;
  }
  if (ctx.matchesAction(event, "cut")) {
    event.preventDefault();
    const hasTargets = ctx.selectedPaths.length > 0 || !!ctx.entries[ctx.focusedIndex];
    if (hasTargets && typeof ctx.canCutTargets === "function" && !ctx.canCutTargets()) {
      reportCapabilityUnavailable();
      return true;
    }
    ctx.cutSelected();
    return true;
  }
  if (ctx.matchesAction(event, "paste")) {
    event.preventDefault();
    if (
      typeof ctx.canPasteCurrentPath === "function" &&
      !ctx.canPasteCurrentPath()
    ) {
      reportCapabilityUnavailable();
      return true;
    }
    ctx.pasteItems();
    return true;
  }
  if (ctx.matchesAction(event, "delete") || isPlainDeleteKey) {
    event.preventDefault();
    const focused = ctx.entries[ctx.focusedIndex];
    const targets =
      ctx.selectedPaths.length > 0 && ctx.selectedPaths.includes(focused?.path)
        ? [...ctx.selectedPaths]
        : focused?.path
          ? [focused.path]
          : [];
    ctx.setDeleteTargets(targets);
    if (targets.length) {
      ctx.setDeleteConfirmOpen(true);
      ctx.setDeleteConfirmIndex(1);
      ctx.setDeleteError("");
    }
    return true;
  }
  if (ctx.matchesAction(event, "history_jump_list")) {
    event.preventDefault();
    if (!ctx.jumpList || ctx.jumpList.length === 0) {
      ctx.setStatusMessage(ctx.t("no_items"));
      return true;
    }
    ctx.setDropdownMode("jump");
    ctx.setDropdownOpen(true);
    return true;
  }
  if (ctx.matchesAction(event, "jump_add")) {
    event.preventDefault();
    ctx.addJumpCurrent();
    return true;
  }
  if (ctx.matchesAction(event, "jump_add_url")) {
    event.preventDefault();
    ctx.openJumpUrlModal();
    return true;
  }
  const extApps = ctx.getExternalApps();
  if (extApps.length) {
    const key = ctx.normalizeKeyString(ctx.eventToKeyString(event));
    const match = extApps.find((app) =>
      ctx.normalizeKeyString(app.shortcut || "").length > 0 &&
      ctx.normalizeKeyString(app.shortcut) === key
    );
    if (match) {
      event.preventDefault();
      const entry = ctx.getTargetEntry();
      ctx.runExternalApp(match, entry);
      return true;
    }
  }
  if (ctx.matchesAction(event, "history")) {
    event.preventDefault();
    if (!ctx.pathHistory || ctx.pathHistory.length === 0) {
      ctx.setStatusMessage(ctx.t("no_items"));
      return true;
    }
    ctx.setDropdownMode("history");
    ctx.setDropdownOpen(true);
    return true;
  }
  if (ctx.matchesAction(event, "search")) {
    event.preventDefault();
    ctx.setSearchActive(true);
    return true;
  }
  if (ctx.matchesAction(event, "sort_menu")) {
    event.preventDefault();
    if (ctx.sortMenuOpen) {
      ctx.closeSortMenu();
    } else {
      ctx.openSortMenu();
    }
    return true;
  }
  return false;
}
