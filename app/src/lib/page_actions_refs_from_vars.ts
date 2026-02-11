import { buildPageActionsRefs } from "./page_actions_context";

/**
 * @param {{
 *   deleteModalEl: HTMLElement | null;
 *   renameInputEl: HTMLInputElement | null;
 *   renameModalEl: HTMLElement | null;
 *   createInputEl: HTMLInputElement | null;
 *   createModalEl: HTMLElement | null;
 *   jumpUrlInputEl: HTMLInputElement | null;
 *   jumpUrlModalEl: HTMLElement | null;
 *   contextMenuEl: HTMLElement | null;
 *   dropdownEl: HTMLElement | null;
 * }} params
 */
export function buildPageActionsRefsFromVars(params) {
  const getVars = typeof params === "function" ? params : () => params;
  return buildPageActionsRefs({
    getDeleteModalEl: () => getVars().deleteModalEl,
    getRenameInputEl: () => getVars().renameInputEl,
    getRenameModalEl: () => getVars().renameModalEl,
    getCreateInputEl: () => getVars().createInputEl,
    getCreateModalEl: () => getVars().createModalEl,
    getJumpUrlInputEl: () => getVars().jumpUrlInputEl,
    getJumpUrlModalEl: () => getVars().jumpUrlModalEl,
    getContextMenuEl: () => getVars().contextMenuEl,
    getDropdownEl: () => getVars().dropdownEl,
  });
}
