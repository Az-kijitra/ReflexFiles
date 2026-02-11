import { createOverlayRuntime } from "./page_overlay_runtime";
import { buildOverlayRuntimeInputsFromState } from "./page_overlay_runtime_inputs_from_state";
import { createViewRuntime } from "./page_view_runtime";
import { buildViewRuntimeInputsFromState } from "./page_view_runtime_inputs_from_state";

/**
 * @param {{
 *   state: any;
 *   shellRefs: { treeEl: HTMLElement | null };
 *   overlayRefs: Record<string, any>;
 *   pageActions: Record<string, any>;
 *   pageActionGroups: any;
 *   menu: { toggleMenu: () => void; getMenuItems: () => any[]; closeMenu: () => void };
 *   list: { loadDir: (path: string) => Promise<void>; focusList: () => void; handlePathTabCompletion: () => Promise<void> };
 *   tree: { focusTree: () => void; focusTreeTop: () => void; selectTreeNode: (node: any, index: number) => void; toggleTreeNode: (node: any, index: number, event?: MouseEvent) => void };
 *   keymap: { matchesAction: (action: string, key: string) => boolean };
 *   sort: { setSort: (key: string) => void; handleSortMenuKey: (event: KeyboardEvent) => void };
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
export function createPageViewRuntimeBundle(params) {
  const overlayRuntime = createOverlayRuntime(
    buildOverlayRuntimeInputsFromState({
      state: params.state,
      refs: params.overlayRefs,
    })
  );

  return {
    overlayBindings: overlayRuntime.bindings,
    getViewProps: () =>
      createViewRuntime(
        buildViewRuntimeInputsFromState({
          state: params.state,
          treeEl: params.shellRefs.treeEl,
          pageActions: params.pageActions,
          pageActionGroups: params.pageActionGroups,
          menu: params.menu,
          list: params.list,
          tree: params.tree,
          keymap: params.keymap,
          sort: params.sort,
          deps: params.deps,
          dirStats: params.dirStats,
          meta: params.meta,
          overlay: overlayRuntime.getState(),
        })
      ).viewProps,
  };
}
