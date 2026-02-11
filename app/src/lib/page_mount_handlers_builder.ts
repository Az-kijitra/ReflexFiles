/**
 * @param {{
 *   keymap: Record<string, any>;
 *   focus: Record<string, any>;
 *   renameCreate: Record<string, any>;
 *   jump: Record<string, any>;
 *   properties: Record<string, any>;
 *   tree: Record<string, any>;
 *   selection: Record<string, any>;
 *   openers: Record<string, any>;
 *   context: Record<string, any>;
 *   menu: Record<string, any>;
 *   list: Record<string, any>;
 *   status: Record<string, any>;
 *   misc: Record<string, any>;
 *   exitApp: () => void;
 *   focusPathInput: () => void;
 * }} params
 */
export function buildPageMountHandlers(params) {
  return {
    ...params.keymap,
    ...params.focus,
    ...params.renameCreate,
    ...params.jump,
    ...params.properties,
    ...params.tree,
    ...params.selection,
    ...params.openers,
    ...params.context,
    ...params.menu,
    ...params.list,
    ...params.status,
    ...params.misc,
    exitApp: params.exitApp,
    focusPathInput: params.focusPathInput,
  };
}
