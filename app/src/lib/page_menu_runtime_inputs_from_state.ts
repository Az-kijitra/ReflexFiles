/**
 * @param {{
 *   state: any;
 *   actions: Record<string, any>;
 *   pageActions: Record<string, any>;
 *   overlayRefs: { searchInputEl: HTMLInputElement | null };
 *   t: (key: string, params?: Record<string, string | number>) => string;
 *   tick: typeof import("svelte").tick;
 *   getMenuShortcut: (action: string) => string;
 *   invokeExit: () => void;
 * }} params
 */
export function buildMenuRuntimeInputsFromState(params) {
  return {
    state: params.state,
    pageActions: params.pageActions,
    openSearch: async () => {
      params.state.searchActive = true;
      await params.tick();
      params.overlayRefs.searchInputEl?.focus();
    },
    openSortMenu: params.actions.openSortMenu,
    toggleHidden: params.actions.toggleHidden,
    toggleTree: params.actions.toggleTree,
    toggleTheme: params.actions.toggleTheme,
    addJumpCurrent: params.actions.addJumpCurrent,
    openJumpUrlModal: params.actions.openJumpUrlModal,
    openJumpList: params.actions.openJumpList,
    openHistoryList: params.actions.openHistoryList,
    t: params.t,
    getMenuShortcut: params.getMenuShortcut,
    invokeExit: params.invokeExit,
    loadDir: params.actions.loadDir,
  };
}
