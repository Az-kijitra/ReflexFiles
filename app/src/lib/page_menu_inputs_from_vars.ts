import { buildMenuSetupInputs } from "./page_menu_inputs";

/**
 * @param {{
 *   state: (() => {
 *     menuOpen: string;
 *     setMenuOpen: (value: string) => void;
 *     showHidden: boolean;
 *     showTree: boolean;
 *     theme: "light" | "dark";
 *     jumpList: unknown[];
 *     pathHistory: string[];
 *     currentPath: string;
 *   }) | {
 *     menuOpen: string;
 *     setMenuOpen: (value: string) => void;
 *     showHidden: boolean;
 *     showTree: boolean;
 *     theme: "light" | "dark";
 *     jumpList: unknown[];
 *     pathHistory: string[];
 *     currentPath: string;
 *   };
 *   actions: (() => {
 *     pageActions: any;
 *     openSearch: () => Promise<void>;
 *     openSortMenu: () => void;
 *     toggleHidden: () => void;
 *     toggleTree: () => void;
 *     toggleTheme: () => void;
 *     addJumpCurrent: () => void;
 *     openJumpUrlModal: () => void;
 *     openJumpList: () => void;
 *     openHistoryList: () => void;
 *   }) | {
 *     pageActions: any;
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
export function buildMenuSetupInputsFromVars(params) {
  const getState = typeof params.state === "function" ? params.state : () => params.state;
  const getActions = typeof params.actions === "function" ? params.actions : () => params.actions;

  return buildMenuSetupInputs({
    state: {
      getMenuOpen: () => getState().menuOpen,
      setMenuOpen: (value) => getState().setMenuOpen(value),
      getShowHidden: () => getState().showHidden,
      getShowTree: () => getState().showTree,
      getTheme: () => getState().theme,
      getJumpList: () => getState().jumpList,
      getPathHistory: () => getState().pathHistory,
      getCurrentPath: () => getState().currentPath,
    },
    actions: {
      pageActions: getActions().pageActions,
      openSearch: () => getActions().openSearch(),
      openSortMenu: () => getActions().openSortMenu(),
      toggleHidden: () => getActions().toggleHidden(),
      toggleTree: () => getActions().toggleTree(),
      toggleTheme: () => getActions().toggleTheme(),
      addJumpCurrent: () => getActions().addJumpCurrent(),
      openJumpUrlModal: () => getActions().openJumpUrlModal(),
      openJumpList: () => getActions().openJumpList(),
      openHistoryList: () => getActions().openHistoryList(),
    },
    helpers: params.helpers,
    deps: params.deps,
  });
}
