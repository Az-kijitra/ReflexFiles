import { buildMenuSetupInputsFromVars } from "./page_menu_inputs_from_vars";
import { setupMenuBundle } from "./page_menu_setup";

/**
 * @param {{
 *   state: any;
 *   pageActions: any;
 *   openSearch: () => Promise<void>;
 *   openSortMenu: () => void;
 *   toggleHidden: () => void;
 *   toggleTree: () => void;
 *   toggleTheme: () => void;
 *   addJumpCurrent: () => void;
 *   openJumpUrlModal: () => void;
 *   openJumpList: () => void;
 *   openHistoryList: () => void;
 *   t: (key: string, params?: Record<string, string | number>) => string;
 *   getMenuShortcut: (action: string) => string;
 *   invokeExit: () => void;
 *   loadDir: (path: string) => Promise<void>;
 * }} params
 */
export function setupMenuRuntime(params) {
  return setupMenuBundle(
    buildMenuSetupInputsFromVars({
      state: () => ({
        menuOpen: params.state.menuOpen,
        setMenuOpen: (value) => {
          params.state.menuOpen = value;
        },
        showHidden: params.state.showHidden,
        showTree: params.state.showTree,
        theme: params.state.ui_theme,
        jumpList: params.state.jumpList,
        pathHistory: params.state.pathHistory,
        currentPath: params.state.currentPath,
      }),
      actions: () => ({
        pageActions: params.pageActions,
        openSearch: params.openSearch,
        openSortMenu: params.openSortMenu,
        toggleHidden: params.toggleHidden,
        toggleTree: params.toggleTree,
        toggleTheme: params.toggleTheme,
        addJumpCurrent: params.addJumpCurrent,
        openJumpUrlModal: params.openJumpUrlModal,
        openJumpList: params.openJumpList,
        openHistoryList: params.openHistoryList,
      }),
      helpers: {
        t: params.t,
        getMenuShortcut: params.getMenuShortcut,
      },
      deps: {
        invokeExit: params.invokeExit,
        loadDir: params.loadDir,
      },
    })
  );
}
