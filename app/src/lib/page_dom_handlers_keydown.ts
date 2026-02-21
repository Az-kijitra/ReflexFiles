import type { PageKeydownParams } from "$lib/page_dom_handlers_keydown_types";

export function createPageKeydownHandler(params: PageKeydownParams) {
  return function onKeyDown(event) {
    if (typeof window !== "undefined" && (window as any).__rf_settings_open === true) {
      return;
    }
    const activeElement = document.activeElement;
    const pathInputEl = params.getPathInputEl();
    const ctrlPressed = event.ctrlKey || event.getModifierState?.("Control");
    const altPressed = event.altKey || event.getModifierState?.("Alt");
    const metaPressed = event.metaKey || event.getModifierState?.("Meta");
    const isCtrlOnly = ctrlPressed && !altPressed && !metaPressed;
    const isCtrlLetter = (letter: string, code: number) =>
      isCtrlOnly &&
      (event.code === `Key${letter}` ||
        event.key === letter ||
        event.key === letter.toLowerCase() ||
        event.key === letter.toUpperCase() ||
        event.keyCode === code ||
        event.which === code);
    const hasOperationTargets =
      params.getSelectedPaths().length > 0 || Boolean(params.getEntries()[params.getFocusedIndex()]);
    const hasBlockingOverlay =
      params.getPasteConfirmOpen() ||
      params.getDeleteConfirmOpen() ||
      params.getJumpUrlOpen() ||
      params.getSortMenuOpen() ||
      params.getZipModalOpen() ||
      params.getFailureModalOpen() ||
      params.getDropdownOpen() ||
      params.getRenameOpen() ||
      params.getCreateOpen() ||
      params.getPropertiesOpen() ||
      params.getContextMenuOpen();

    // WebView/IME differences occasionally break keymap matching for these basic shortcuts.
    // Keep a direct fallback at the top-level keydown entry.
    // Ctrl+J must be captured here as well to avoid WebView2 default downloads popup.
    if (!hasBlockingOverlay) {
      if (isCtrlLetter("J", 74)) {
        event.preventDefault();
        const jumpList = params.getJumpList();
        if (!Array.isArray(jumpList) || jumpList.length === 0) {
          params.setStatusMessage(params.t("no_items"));
          return;
        }
        params.setDropdownMode("jump");
        params.setDropdownOpen(true);
        return;
      }
      if (isCtrlLetter("N", 78)) {
        event.preventDefault();
        if (import.meta.env.DEV) {
          params.setStatusMessage("DBG Ctrl+N");
        }
        params.openCreate("file");
        return;
      }
      if (isCtrlLetter("C", 67)) {
        event.preventDefault();
        if (!hasOperationTargets) {
          params.setStatusMessage(params.t("status.no_selection"));
          return;
        }
        if (import.meta.env.DEV) {
          params.setStatusMessage("DBG Ctrl+C");
        }
        params.copySelected();
        return;
      }
      if (isCtrlLetter("X", 88)) {
        event.preventDefault();
        if (!hasOperationTargets) {
          params.setStatusMessage(params.t("status.no_selection"));
          return;
        }
        if (import.meta.env.DEV) {
          params.setStatusMessage("DBG Ctrl+X");
        }
        params.cutSelected();
        return;
      }
      if (isCtrlLetter("V", 86)) {
        event.preventDefault();
        if (import.meta.env.DEV) {
          params.setStatusMessage("DBG Ctrl+V");
        }
        params.pasteItems();
        return;
      }
    }

    const handled = params.handleGlobalKey(event, {
      activeElement,
      listEl: params.getListEl(),
      pathInputEl,
      treeEl: params.getTreeEl(),
      dropdownEl: params.getDropdownEl(),
      contextMenuEl: params.getContextMenuEl(),
      pasteConfirmOpen: params.getPasteConfirmOpen(),
      deleteConfirmOpen: params.getDeleteConfirmOpen(),
      jumpUrlOpen: params.getJumpUrlOpen(),
      sortMenuOpen: params.getSortMenuOpen(),
      zipModalOpen: params.getZipModalOpen(),
      failureModalOpen: params.getFailureModalOpen(),
      dropdownOpen: params.getDropdownOpen(),
      renameOpen: params.getRenameOpen(),
      createOpen: params.getCreateOpen(),
      propertiesOpen: params.getPropertiesOpen(),
      contextMenuOpen: params.getContextMenuOpen(),
      showTree: params.getShowTree(),
      showHidden: params.getShowHidden(),
      showSize: params.getShowSize(),
      showTime: params.getShowTime(),
      searchActive: params.getSearchActive(),
      currentPath: params.getCurrentPath(),
      dropdownMode: params.getDropdownMode(),
      entries: params.getEntries(),
      focusedIndex: params.getFocusedIndex(),
      listRows: params.getListRows(),
      selectedPaths: params.getSelectedPaths(),
      jumpList: params.getJumpList(),
      pathHistory: params.getPathHistory(),
      menuOpen: params.getMenuOpen(),
      matchesAction: params.matchesAction,
      handleSortMenuKey: params.handleSortMenuKey,
      focusTreeTop: params.focusTreeTop,
      focusList: params.focusList,
      cancelRename: params.cancelRename,
      confirmRename: params.confirmRename,
      cancelCreate: params.cancelCreate,
      confirmCreate: params.confirmCreate,
      cancelJumpUrl: params.cancelJumpUrl,
      confirmJumpUrl: params.confirmJumpUrl,
      closeProperties: params.closeProperties,
      handleContextMenuKey: params.handleContextMenuKey,
      openConfigFile: params.openConfigFile,
      openKeymapHelp: params.openKeymapHelp,
      handleTreeKey: params.handleTreeKey,
      performUndo: params.performUndo,
      performRedo: params.performRedo,
      clearDirStatsCache: params.clearDirStatsCache,
      setStatusMessage: params.setStatusMessage,
      selectAll: params.selectAll,
      setSelected: params.setSelected,
      setAnchorIndex: params.setAnchorIndex,
      updateListRows: params.updateListRows,
      scheduleUiSave: params.scheduleUiSave,
      buildTreeRoot: params.buildTreeRoot,
      showError: params.showError,
      openInExplorer: params.openInExplorer,
      openInCmd: params.openInCmd,
      openInTerminalCmd: params.openInTerminalCmd,
      openInTerminalPowerShell: params.openInTerminalPowerShell,
      openInTerminalWsl: params.openInTerminalWsl,
      openInVSCode: params.openInVSCode,
      openInGitClient: params.openInGitClient,
      openZipCreate: params.openZipCreate,
      openZipExtract: params.openZipExtract,
      openProperties: params.openProperties,
      loadDir: params.loadDir,
      moveFocusByRow: params.moveFocusByRow,
      moveFocusByColumn: params.moveFocusByColumn,
      toggleSelection: params.toggleSelection,
      openEntry: params.openEntry,
      openRename: params.openRename,
      openCreate: params.openCreate,
      copySelected: params.copySelected,
      duplicateSelected: params.duplicateSelected,
      prefixDateSelected: params.prefixDateSelected,
      cutSelected: params.cutSelected,
      pasteItems: params.pasteItems,
      hasOperationTargets: params.hasOperationTargets,
      hasSelection: params.hasSelection,
      canCreateCurrentPath: params.canCreateCurrentPath,
      canPasteCurrentPath: params.canPasteCurrentPath,
      canCopyTargets: params.canCopyTargets,
      canDuplicateTargets: params.canDuplicateTargets,
      canPrefixDateTargets: params.canPrefixDateTargets,
      canCutTargets: params.canCutTargets,
      canRenameFocused: params.canRenameFocused,
      canDeleteSelection: params.canDeleteSelection,
      canDeleteTargets: params.canDeleteTargets,
      canOpenPropertiesSelection: params.canOpenPropertiesSelection,
      canZipCreateSelection: params.canZipCreateSelection,
      canZipExtractSelection: params.canZipExtractSelection,
      canZipExtractFocused: params.canZipExtractFocused,
      addJumpCurrent: params.addJumpCurrent,
      openJumpUrlModal: params.openJumpUrlModal,
      openSortMenu: params.openSortMenu,
      closeSortMenu: params.closeSortMenu,
      getExternalApps: params.getExternalApps,
      runExternalApp: params.runExternalApp,
      setDropdownMode: params.setDropdownMode,
      setDropdownOpen: params.setDropdownOpen,
      setSearchActive: params.setSearchActive,
      setPathInput: params.setPathInput,
      setShowHidden: params.setShowHidden,
      setShowSize: params.setShowSize,
      setShowTime: params.setShowTime,
      setShowTree: params.setShowTree,
      setDeleteTargets: params.setDeleteTargets,
      setDeleteConfirmOpen: params.setDeleteConfirmOpen,
      setDeleteConfirmIndex: params.setDeleteConfirmIndex,
      setDeleteError: params.setDeleteError,
      setPathHistory: params.setPathHistory,
      closeMenu: params.closeMenu,
      t: params.t,
      confirm: params.confirm,
      exitApp: params.exitApp,
      focusPathInput: params.focusPathInput,
      eventToKeyString: params.eventToKeyString,
      normalizeKeyString: params.normalizeKeyString,
      getTargetEntry: params.getTargetEntry,
    });
    if (handled) return;
  };
}

