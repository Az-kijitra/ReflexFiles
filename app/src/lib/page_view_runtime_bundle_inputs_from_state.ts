/**
 * @param {{
 *   state: any | (() => any);
 *   shellRefs: { treeEl: HTMLElement | null } | (() => { treeEl: HTMLElement | null });
 *   overlayRefs: Record<string, any> | (() => Record<string, any>);
 *   pageActions: Record<string, any>;
 *   pageActionGroups: any;
 *   actions: {
 *     toggleMenu: () => void;
 *     getMenuItems: () => any[];
 *     closeMenu: () => void;
 *     loadDir: (path: string) => Promise<void>;
 *     focusList: () => void;
 *     handlePathTabCompletion: () => Promise<void>;
 *     focusTree: () => void;
 *     focusTreeTop: () => void;
 *     selectTreeNode: (node: any, index: number) => void;
 *     toggleTreeNode: (node: any, index: number, event?: MouseEvent) => void;
 *     matchesAction: (action: string, key: string) => boolean;
 *     setSort: (key: string) => void;
 *     handleSortMenuKey: (event: KeyboardEvent) => void;
 *   };
 *   deps: {
 *     getVisibleTreeNodes: (...args: any[]) => any[];
 *     trapModalTab: (event: KeyboardEvent, el: HTMLElement | null) => boolean;
 *     openUrl: (url: string) => Promise<void>;
 *     autofocus: (el: HTMLElement | null) => void;
 *   };
 *   dirStats: { clearDirStatsCache: () => void };
 *   meta: any;
 * }} params
 */
export function buildPageViewRuntimeBundleInputsFromState(params) {
  const state = typeof params.state === "function" ? params.state() : params.state;
  const shellRefs = typeof params.shellRefs === "function" ? params.shellRefs() : params.shellRefs;
  const overlayRefs =
    typeof params.overlayRefs === "function" ? params.overlayRefs() : params.overlayRefs;

  return {
    state,
    shellRefs,
    overlayRefs,
    pageActions: params.pageActions,
    pageActionGroups: params.pageActionGroups,
    menu: {
      toggleMenu: params.actions.toggleMenu,
      getMenuItems: params.actions.getMenuItems,
      closeMenu: params.actions.closeMenu,
    },
    list: {
      loadDir: params.actions.loadDir,
      focusList: params.actions.focusList,
      handlePathTabCompletion: params.actions.handlePathTabCompletion,
    },
    tree: {
      focusTree: params.actions.focusTree,
      focusTreeTop: params.actions.focusTreeTop,
      selectTreeNode: params.actions.selectTreeNode,
      toggleTreeNode: params.actions.toggleTreeNode,
    },
    keymap: { matchesAction: params.actions.matchesAction },
    sort: {
      setSort: params.actions.setSort,
      handleSortMenuKey: params.actions.handleSortMenuKey,
    },
    deps: params.deps,
    dirStats: params.dirStats,
    meta: params.meta,
  };
}
