import type { PageKeydownParams } from "$lib/page_dom_handlers_keydown_types";

export function createPageKeydownHandler(params: PageKeydownParams) {
  const devKeyDebug = Boolean((import.meta as any)?.env?.DEV);
  return function onKeyDown(event) {
    try {
    if (typeof window !== "undefined" && (window as any).__rf_settings_open === true) {
      const target = (event as any)?.target;
      const inSettingsModal =
        !!target &&
        typeof target.closest === "function" &&
        Boolean(target.closest(".settings-modal"));
      if (inSettingsModal) {
        return;
      }
    }
    const activeElement = document.activeElement;
    const eventTarget = (event as any)?.target;
    const targetClosest =
      eventTarget && typeof (eventTarget as any).closest === "function"
        ? (selector: string) => (eventTarget as any).closest(selector)
        : () => null;
    const pathInputEl = params.getPathInputEl();
    const focusSearchInputSoon = () => {
      const focusNow = () => {
        const searchInputEl = params.getSearchInputEl?.();
        searchInputEl?.focus?.({ preventScroll: true });
      };
      focusNow();
      if (typeof queueMicrotask === "function") {
        queueMicrotask(focusNow);
      }
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(focusNow);
      }
      if (typeof setTimeout === "function") {
        setTimeout(focusNow, 0);
        setTimeout(focusNow, 30);
        setTimeout(focusNow, 120);
      }
    };
    const ctrlPressed = event.ctrlKey || event.getModifierState?.("Control");
    const altPressed = event.altKey || event.getModifierState?.("Alt");
    const shiftPressed = event.shiftKey || event.getModifierState?.("Shift");
    const metaPressed = event.metaKey || event.getModifierState?.("Meta");
    const isCtrlOnly = ctrlPressed && !altPressed && !metaPressed;
    const isAltOnly = altPressed && !ctrlPressed && !metaPressed;
    const isCtrlLetter = (letter: string, code: number) =>
      isCtrlOnly &&
      (event.code === `Key${letter}` ||
        event.key === letter ||
        event.key === letter.toLowerCase() ||
        event.key === letter.toUpperCase() ||
        event.keyCode === code ||
        event.which === code);
    const isCtrlComma =
      isCtrlOnly &&
      (event.code === "Comma" ||
        event.key === "," ||
        event.key === "、" ||
        event.keyCode === 188 ||
        event.which === 188);
    const isF1 =
      !ctrlPressed &&
      !altPressed &&
      !metaPressed &&
      (event.key === "F1" || event.code === "F1" || event.keyCode === 112 || event.which === 112);
    const isF2 =
      !ctrlPressed &&
      !altPressed &&
      !metaPressed &&
      (event.key === "F2" || event.code === "F2" || event.keyCode === 113 || event.which === 113);
    const isAltLetter = (letter: string, code: number) =>
      isAltOnly &&
      (event.code === `Key${letter}` ||
        event.key === letter ||
        event.key === letter.toLowerCase() ||
        event.key === letter.toUpperCase() ||
        event.keyCode === code ||
        event.which === code);
    const isCtrlAltLetter = (letter: string, code: number) =>
      ctrlPressed &&
      altPressed &&
      !metaPressed &&
      (event.code === `Key${letter}` ||
        event.key === letter ||
        event.key === letter.toLowerCase() ||
        event.key === letter.toUpperCase() ||
        event.keyCode === code ||
        event.which === code);
    const matchesActionSafe = (actionId: string) => {
      try {
        return !!params.matchesAction?.(event, actionId as any);
      } catch {
        return false;
      }
    };
    const hasOperationTargets =
      params.getSelectedPaths().length > 0 || Boolean(params.getEntries()[params.getFocusedIndex()]);
    const isAnyInputActive = Boolean(activeElement && (activeElement as any).tagName === "INPUT");
    const searchInputEl = params.getSearchInputEl?.();
    const isSearchInputActive =
      Boolean(searchInputEl && activeElement === searchInputEl) ||
      Boolean(
        searchInputEl &&
          activeElement &&
          typeof (searchInputEl as any).contains === "function" &&
          (searchInputEl as any).contains(activeElement)
      );
    const isPathInputActive =
      Boolean(pathInputEl && activeElement === pathInputEl) ||
      Boolean(
        pathInputEl &&
          activeElement &&
          typeof (pathInputEl as any).contains === "function" &&
          (pathInputEl as any).contains(activeElement)
      );
    const isHiddenSearchInputActive = isSearchInputActive && !params.getSearchActive();
    const isBlockingTextInputActive = isAnyInputActive && !isHiddenSearchInputActive;
    const isOverlayDomTarget = Boolean(
      targetClosest(".modal, .modal-backdrop, .context-menu, .dropdown, .menu-dropdown, .sort-menu")
    );
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

    if (devKeyDebug) {
      const isDebugTargetKey =
        isCtrlLetter("F", 70) ||
        isF2 ||
        (!shiftPressed && isCtrlAltLetter("Z", 90)) ||
        (!shiftPressed && isCtrlAltLetter("X", 88));
      if (isDebugTargetKey) {
        const activeTag = (activeElement as any)?.tagName || "-";
        const targetTag = (eventTarget as any)?.tagName || (eventTarget as any)?.constructor?.name || "-";
        params.setStatusMessage(
          `DBG key=${String(event.key)} code=${String(event.code)} active=${activeTag} target=${targetTag} overlay=${hasBlockingOverlay ? 1 : 0} overlayDom=${isOverlayDomTarget ? 1 : 0}`
        );
      }
    }

    // These shortcuts are core file-list operations. Let them bypass stale overlay flags,
    // but still avoid firing when the event actually originates inside overlay UI.
    if (!isOverlayDomTarget) {
      if (isCtrlLetter("F", 70)) {
        event.preventDefault();
        params.setSearchActive(true);
        focusSearchInputSoon();
        return;
      }
      if (matchesActionSafe("search")) {
        event.preventDefault();
        params.setSearchActive(true);
        focusSearchInputSoon();
        return;
      }
      if (isF2) {
        if (isBlockingTextInputActive) return;
        event.preventDefault();
        const entry = params.getEntries()[params.getFocusedIndex()];
        if (!entry) {
          params.setStatusMessage(params.t("no_items"));
          return;
        }
        params.openRename(entry);
        return;
      }
      if (matchesActionSafe("rename")) {
        if (isBlockingTextInputActive) return;
        event.preventDefault();
        const entry = params.getEntries()[params.getFocusedIndex()];
        if (!entry) {
          params.setStatusMessage(params.t("no_items"));
          return;
        }
        if (typeof params.canRenameFocused === "function" && !params.canRenameFocused()) {
          params.setStatusMessage(params.t("capability.not_available"));
          return;
        }
        params.openRename(entry);
        return;
      }
      if (!shiftPressed && isCtrlAltLetter("Z", 90)) {
        if (isBlockingTextInputActive) return;
        event.preventDefault();
        const entry = params.getEntries()[params.getFocusedIndex()];
        if (
          params.getSelectedPaths().length === 0 &&
          entry?.path
        ) {
          params.setSelected([entry.path]);
          params.setAnchorIndex(params.getFocusedIndex());
        }
        params.openZipCreate();
        return;
      }
      if (matchesActionSafe("zip_create")) {
        if (isBlockingTextInputActive) return;
        event.preventDefault();
        if (
          params.getSelectedPaths().length > 0 &&
          typeof params.canZipCreateSelection === "function" &&
          !params.canZipCreateSelection()
        ) {
          params.setStatusMessage(params.t("capability.not_available"));
          return;
        }
        params.openZipCreate();
        return;
      }
      if (!shiftPressed && isCtrlAltLetter("X", 88)) {
        if (isBlockingTextInputActive) return;
        event.preventDefault();
        const entry = params.getEntries()[params.getFocusedIndex()];
        if (!entry || entry.ext?.toLowerCase() !== ".zip") {
          params.setStatusMessage(params.t("no_items"));
          return;
        }
        if (params.getSelectedPaths().length !== 1 || params.getSelectedPaths()[0] !== entry.path) {
          params.setSelected([entry.path]);
          params.setAnchorIndex(params.getFocusedIndex());
        }
        params.openZipExtract();
        return;
      }
      if (matchesActionSafe("zip_extract")) {
        if (isBlockingTextInputActive) return;
        event.preventDefault();
        const entry = params.getEntries()[params.getFocusedIndex()];
        if (!entry || entry.ext?.toLowerCase() !== ".zip") {
          params.setStatusMessage(params.t("no_items"));
          return;
        }
        if (typeof params.canZipExtractFocused === "function" && !params.canZipExtractFocused()) {
          params.setStatusMessage(params.t("capability.not_available"));
          return;
        }
        if (params.getSelectedPaths().length !== 1 || params.getSelectedPaths()[0] !== entry.path) {
          params.setSelected([entry.path]);
          params.setAnchorIndex(params.getFocusedIndex());
        }
        params.openZipExtract();
        return;
      }
    }

    // WebView/IME differences occasionally break keymap matching for these basic shortcuts.
    // Keep a direct fallback at the top-level keydown entry.
    if (!hasBlockingOverlay) {
      if (isCtrlComma) {
        event.preventDefault();
        params.openConfigFile();
        return;
      }
      if (isF1) {
        event.preventDefault();
        params.openKeymapHelp();
        return;
      }
      if (isCtrlLetter("D", 68)) {
        if (shiftPressed) {
          if (isAnyInputActive && !isPathInputActive) return;
          event.preventDefault();
          params.openJumpUrlModal();
          return;
        }
        if (isAnyInputActive) return;
        event.preventDefault();
        params.addJumpCurrent();
        return;
      }
      if (!shiftPressed && isCtrlLetter("H", 72)) {
        if (isAnyInputActive && !isPathInputActive) return;
        event.preventDefault();
        const pathHistory = params.getPathHistory();
        if (!pathHistory || pathHistory.length === 0) {
          params.setStatusMessage(params.t("no_items"));
          return;
        }
        params.setDropdownMode("history");
        params.setDropdownOpen(true);
        return;
      }
      if (shiftPressed && isCtrlLetter("O", 79)) {
        if (isAnyInputActive && !isPathInputActive) return;
        event.preventDefault();
        const jumpList = params.getJumpList();
        if (!jumpList || jumpList.length === 0) {
          params.setStatusMessage(params.t("no_items"));
          return;
        }
        params.setDropdownMode("jump");
        params.setDropdownOpen(true);
        return;
      }
      if (!shiftPressed && isAltLetter("D", 68)) {
        event.preventDefault();
        params.setSearchActive(false);
        params.setDropdownOpen(false);
        params.setPathInput(params.getCurrentPath());
        params.focusPathInput();
        return;
      }
      if (!shiftPressed && isAltLetter("S", 83)) {
        if (isAnyInputActive) return;
        event.preventDefault();
        params.openSortMenu();
        return;
      }
      if (isCtrlLetter("N", 78)) {
        if (isAnyInputActive && !isPathInputActive) return;
        event.preventDefault();
        if (devKeyDebug) {
          params.setStatusMessage(shiftPressed ? "DBG Ctrl+Shift+N" : "DBG Ctrl+N");
        }
        params.openCreate(shiftPressed ? "folder" : "file");
        return;
      }
      if (isCtrlLetter("C", 67)) {
        if (isPathInputActive) return;
        event.preventDefault();
        if (!hasOperationTargets) {
          params.setStatusMessage(params.t("status.no_selection"));
          return;
        }
        if (devKeyDebug) {
          params.setStatusMessage("DBG Ctrl+C");
        }
        params.copySelected();
        return;
      }
      if (isCtrlLetter("X", 88)) {
        if (isPathInputActive) return;
        event.preventDefault();
        if (!hasOperationTargets) {
          params.setStatusMessage(params.t("status.no_selection"));
          return;
        }
        if (devKeyDebug) {
          params.setStatusMessage("DBG Ctrl+X");
        }
        params.cutSelected();
        return;
      }
      if (isCtrlLetter("V", 86)) {
        if (isPathInputActive) return;
        event.preventDefault();
        if (devKeyDebug) {
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
    } catch (err) {
      try {
        const message = err instanceof Error ? err.message : String(err);
        params.setStatusMessage(`DBG keydown error: ${message}`, 5000);
      } catch {
        // ignore
      }
      if (devKeyDebug && typeof console !== "undefined") {
        console.error("[rf] keydown handler error", err);
      }
    }
  };
}

