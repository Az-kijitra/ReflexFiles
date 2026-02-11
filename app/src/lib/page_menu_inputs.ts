/**
 * @param {{
 *   state: {
 *     getMenuOpen: () => string;
 *     setMenuOpen: (value: string) => void;
 *     getShowHidden: () => boolean;
 *     getShowTree: () => boolean;
 *     getTheme: () => "light" | "dark";
 *     getJumpList: () => unknown[];
 *     getPathHistory: () => string[];
 *     getCurrentPath: () => string;
 *   };
 *   actions: {
 *     pageActions: {
 *       openFocusedOrSelected: () => void;
 *       openParentForSelection: () => void;
 *       openInExplorer: () => void;
 *       openInCmd: () => void;
 *       openInVSCode: () => void;
 *       openInGitClient: () => void;
 *       copySelected: () => void;
 *       duplicateSelected: () => void;
 *       prefixDateSelected: () => void;
 *       cutSelected: () => void;
 *       pasteItems: () => void;
 *       requestDeleteSelected: () => void;
 *       requestOpenPropertiesSelected: () => void;
 *       performUndo: () => void;
 *       performRedo: () => void;
 *       selectAll: () => void;
 *       clearSelection: () => void;
 *       invertSelection: () => void;
 *       openKeymapHelp: () => void;
 *       openUserManual: () => void;
 *       openAbout: () => void;
 *       setStatusMessage: (message: string, timeoutMs?: number) => void;
 *     };
 *     openSearch: () => Promise<void>;
 *     openSortMenu: () => void;
 *     toggleHidden: () => void;
 *     toggleTree: () => void;
 *     toggleTheme: () => void;
 *     addJumpCurrent: () => void;
 *     openJumpUrlModal: () => void;
 *     openJumpList: () => void;
 *     openHistoryList: () => void;
 *   };
 *   helpers: {
 *     t: (key: string, params?: Record<string, string | number>) => string;
 *     getMenuShortcut: (action: string) => string;
 *   };
 *   deps: {
 *     invokeExit: () => void;
 *     loadDir: (path: string) => Promise<void>;
 *   };
 * }} params
 */
export function buildMenuSetupInputs(params) {
  const { state, actions, helpers, deps } = params;
  const page = actions.pageActions;
  return {
    menuState: {
      getMenuOpen: state.getMenuOpen,
      setMenuOpen: state.setMenuOpen,
    },
    menuItems: ({ closeMenu }) => ({
      t: helpers.t,
      getMenuShortcut: helpers.getMenuShortcut,
      openFocusedOrSelected: page.openFocusedOrSelected,
      openParentForSelection: page.openParentForSelection,
      openInExplorer: page.openInExplorer,
      openInCmd: page.openInCmd,
      openInVSCode: page.openInVSCode,
      openInGitClient: page.openInGitClient,
      copySelected: page.copySelected,
      duplicateSelected: page.duplicateSelected,
      prefixDateSelected: page.prefixDateSelected,
      cutSelected: page.cutSelected,
      pasteItems: page.pasteItems,
      requestDeleteSelected: page.requestDeleteSelected,
      requestOpenPropertiesSelected: page.requestOpenPropertiesSelected,
      invokeExit: deps.invokeExit,
      performUndo: page.performUndo,
      performRedo: page.performRedo,
      selectAll: page.selectAll,
      clearSelection: page.clearSelection,
      invertSelection: page.invertSelection,
      openSearch: actions.openSearch,
      openSortMenu: actions.openSortMenu,
      toggleHidden: actions.toggleHidden,
      toggleTree: actions.toggleTree,
      toggleTheme: actions.toggleTheme,
      refresh: () => deps.loadDir(state.getCurrentPath()),
      addJumpCurrent: actions.addJumpCurrent,
      openJumpUrlModal: actions.openJumpUrlModal,
      openJumpList: actions.openJumpList,
      openHistoryList: actions.openHistoryList,
      openKeymapHelp: page.openKeymapHelp,
      openUserManual: page.openUserManual,
      openAbout: page.openAbout,
      closeMenu,
      getShowHidden: state.getShowHidden,
      getShowTree: state.getShowTree,
      getTheme: state.getTheme,
      hasJumpList: () => !!state.getJumpList()?.length,
      hasPathHistory: () => !!state.getPathHistory()?.length,
      setStatusMessage: page.setStatusMessage,
    }),
  };
}
