import { buildPageMountHandlers } from "./page_mount_handlers_builder";

/**
 * @param {{
 *   keymap: Record<string, any>;
 *   focus: Record<string, any>;
 *   actionGroups: {
 *     renameCreateZip?: Record<string, any>;
 *     jump?: Record<string, any>;
 *     properties?: Record<string, any>;
 *     selection?: Record<string, any>;
 *     openers?: Record<string, any>;
 *     context?: Record<string, any>;
 *     status?: Record<string, any>;
 *   };
 *   propertiesExtras?: Record<string, any>;
 *   tree: Record<string, any>;
 *   menu: Record<string, any>;
 *   list: Record<string, any>;
 *   misc: Record<string, any>;
 *   exitApp: () => void;
 *   focusPathInput: () => void;
 * }} params
 */
export function buildPageMountHandlersFromState(params) {
  const groups = params.actionGroups ?? {};
  return buildPageMountHandlers({
    keymap: params.keymap,
    focus: params.focus,
    renameCreate: groups.renameCreateZip ?? {},
    jump: groups.jump ?? {},
    properties: { ...(groups.properties ?? {}), ...(params.propertiesExtras ?? {}) },
    tree: params.tree,
    selection: groups.selection ?? {},
    openers: groups.openers ?? {},
    context: groups.context ?? {},
    menu: params.menu,
    list: params.list,
    status: groups.status ?? {},
    misc: params.misc,
    exitApp: params.exitApp,
    focusPathInput: params.focusPathInput,
  });
}

/**
 * @param {{
 *   actions: {
 *     matchesAction: (action: string, key: string) => boolean;
 *     handleSortMenuKey: (event: KeyboardEvent) => void;
 *     focusTreeTop: () => void;
 *     focusList: () => void;
 *     moveFocusByRow: (delta: number, extend?: boolean) => void;
 *     moveFocusByColumn: (delta: number) => void;
 *     handleTreeKey: (event: KeyboardEvent) => unknown;
 *     buildTreeRoot: (path: string) => Promise<void>;
 *     openSortMenu: () => void;
 *     closeSortMenu: () => void;
 *     closeMenu: () => void;
 *     updateListRows: () => void;
 *     scheduleUiSave: () => void;
 *     loadDir: (path: string) => Promise<void>;
 *   };
 *   pageActionGroups: {
 *     renameCreateZip?: Record<string, any>;
 *     jump?: Record<string, any>;
 *     properties?: Record<string, any>;
 *     selection?: Record<string, any>;
 *     openers?: Record<string, any>;
 *     context?: Record<string, any>;
 *     status?: Record<string, any>;
 *   };
 *   propertiesExtras?: Record<string, any>;
 *   showError: (err: unknown) => void;
 *   exitApp: () => void;
 *   focusPathInput: () => void;
 * }} params
 */
export function buildPageMountHandlersInputsFromState(params) {
  return {
    keymap: {
      matchesAction: params.actions.matchesAction,
      handleSortMenuKey: params.actions.handleSortMenuKey,
    },
    focus: {
      focusTreeTop: params.actions.focusTreeTop,
      focusList: params.actions.focusList,
      moveFocusByRow: params.actions.moveFocusByRow,
      moveFocusByColumn: params.actions.moveFocusByColumn,
    },
    actionGroups: params.pageActionGroups,
    propertiesExtras: params.propertiesExtras,
    tree: {
      handleTreeKey: params.actions.handleTreeKey,
      buildTreeRoot: params.actions.buildTreeRoot,
    },
    menu: {
      openSortMenu: params.actions.openSortMenu,
      closeSortMenu: params.actions.closeSortMenu,
      closeMenu: params.actions.closeMenu,
    },
    list: {
      updateListRows: params.actions.updateListRows,
      scheduleUiSave: params.actions.scheduleUiSave,
      loadDir: params.actions.loadDir,
    },
    misc: { showError: params.showError },
    exitApp: params.exitApp,
    focusPathInput: params.focusPathInput,
  };
}
