import { buildPageMountDomHandlersFromVars } from "./page_mount_dom_handlers_from_vars";

/**
 * @param {{
 *   state: any;
 *   refs: {
 *     listEl: HTMLElement | null;
 *     pathInputEl: HTMLInputElement | null;
 *     treeEl: HTMLElement | null;
 *     dropdownEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *     menuBarEl: HTMLElement | null;
 *   } | (() => {
 *     listEl: HTMLElement | null;
 *     pathInputEl: HTMLInputElement | null;
 *     treeEl: HTMLElement | null;
 *     dropdownEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *     menuBarEl: HTMLElement | null;
 *   });
 *   handlers: Record<string, any> | (() => Record<string, any>);
 *   helpers: object | (() => object);
 *   constants: { KEYMAP_ACTIONS: Record<string, string> };
 * }} params
 */
export function buildPageMountDomHandlersInputsFromState(params) {
  const getRefs = typeof params.refs === "function" ? params.refs : () => params.refs;
  const getHandlers =
    typeof params.handlers === "function" ? params.handlers : () => params.handlers;

  return buildPageMountDomHandlersFromVars({
    state: () => {
      const refs = getRefs();
      return {
        listEl: refs.listEl,
        pathInputEl: refs.pathInputEl,
        treeEl: refs.treeEl,
        dropdownEl: refs.dropdownEl,
        contextMenuEl: refs.contextMenuEl,
        pasteConfirmOpen: params.state.pasteConfirmOpen,
        deleteConfirmOpen: params.state.deleteConfirmOpen,
        jumpUrlOpen: params.state.jumpUrlOpen,
        sortMenuOpen: params.state.sortMenuOpen,
        zipModalOpen: params.state.zipModalOpen,
        failureModalOpen: params.state.failureModalOpen,
        dropdownOpen: params.state.dropdownOpen,
        renameOpen: params.state.renameOpen,
        createOpen: params.state.createOpen,
        propertiesOpen: params.state.propertiesOpen,
        contextMenuOpen: params.state.contextMenuOpen,
        showTree: params.state.showTree,
        showHidden: params.state.showHidden,
        showSize: params.state.showSize,
        showTime: params.state.showTime,
        searchActive: params.state.searchActive,
        currentPath: params.state.currentPath,
        dropdownMode: params.state.dropdownMode,
        entries: params.state.entries,
        focusedIndex: params.state.focusedIndex,
        listRows: params.state.listRows,
        selectedPaths: params.state.selectedPaths,
        jumpList: params.state.jumpList,
        pathHistory: params.state.pathHistory,
        menuOpen: params.state.menuOpen,
        menuBarEl: refs.menuBarEl,
      };
    },
    actions: () => {
      const handlers = getHandlers();
      return {
        matchesAction: handlers.matchesAction,
        handleSortMenuKey: handlers.handleSortMenuKey,
        focusTreeTop: handlers.focusTreeTop,
        focusList: handlers.focusList,
        cancelRename: handlers.cancelRename,
        confirmRename: handlers.confirmRename,
        cancelCreate: handlers.cancelCreate,
        confirmCreate: handlers.confirmCreate,
        cancelJumpUrl: handlers.cancelJumpUrl,
        confirmJumpUrl: handlers.confirmJumpUrl,
        closeProperties: handlers.closeProperties,
        handleContextMenuKey: handlers.handleContextMenuKey,
        openConfigFile: handlers.openConfigFile,
        openKeymapHelp: handlers.openKeymapHelp,
        handleTreeKey: handlers.handleTreeKey,
        performUndo: handlers.performUndo,
        performRedo: handlers.performRedo,
        clearDirStatsCache: handlers.clearDirStatsCache,
        setStatusMessage: handlers.setStatusMessage,
        selectAll: handlers.selectAll,
        setSelected: handlers.setSelected,
        setAnchorIndex: (value) => {
          params.state.anchorIndex = value;
        },
        updateListRows: handlers.updateListRows,
        scheduleUiSave: handlers.scheduleUiSave,
        buildTreeRoot: handlers.buildTreeRoot,
        showError: handlers.showError,
        openInExplorer: handlers.openInExplorer,
        openInCmd: handlers.openInCmd,
        openInVSCode: handlers.openInVSCode,
        openInGitClient: handlers.openInGitClient,
        openZipCreate: handlers.openZipCreate,
        openZipExtract: handlers.openZipExtract,
        openProperties: handlers.openProperties,
        loadDir: handlers.loadDir,
        moveFocusByRow: handlers.moveFocusByRow,
        moveFocusByColumn: handlers.moveFocusByColumn,
        toggleSelection: handlers.toggleSelection,
        selectRange: handlers.selectRange,
        openEntry: handlers.openEntry,
        openRename: handlers.openRename,
        openCreate: handlers.openCreate,
        copySelected: handlers.copySelected,
        duplicateSelected: handlers.duplicateSelected,
        prefixDateSelected: handlers.prefixDateSelected,
        cutSelected: handlers.cutSelected,
        pasteItems: handlers.pasteItems,
        addJumpCurrent: handlers.addJumpCurrent,
        openJumpUrlModal: handlers.openJumpUrlModal,
        openSortMenu: handlers.openSortMenu,
        closeSortMenu: handlers.closeSortMenu,
        getExternalApps: handlers.getExternalApps,
        runExternalApp: handlers.runExternalApp,
        setDropdownMode: (value) => {
          params.state.dropdownMode = value;
        },
        setDropdownOpen: (value) => {
          params.state.dropdownOpen = value;
        },
        setSearchActive: (value) => {
          params.state.searchActive = value;
        },
        setPathInput: (value) => {
          params.state.pathInput = value;
        },
        setShowHidden: (value) => {
          params.state.showHidden = value;
        },
        setShowSize: (value) => {
          params.state.showSize = value;
        },
        setShowTime: (value) => {
          params.state.showTime = value;
        },
        setShowTree: (value) => {
          params.state.showTree = value;
        },
        setDeleteTargets: (value) => {
          params.state.deleteTargets = value;
        },
        setDeleteConfirmOpen: (value) => {
          params.state.deleteConfirmOpen = value;
        },
        setDeleteConfirmIndex: (value) => {
          params.state.deleteConfirmIndex = value;
        },
        setDeleteError: (value) => {
          params.state.deleteError = value;
        },
        setPathHistory: (value) => {
          params.state.pathHistory = value;
        },
        exitApp: handlers.exitApp,
        focusPathInput: handlers.focusPathInput,
        getTargetEntry: handlers.getTargetEntry,
        closeContextMenu: handlers.closeContextMenu,
        closeMenu: handlers.closeMenu,
      };
    },
    helpers: params.helpers,
    constants: params.constants,
  });
}
