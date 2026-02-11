import { FocusSectionParams } from "./types";

/**
 * @param {FocusSectionParams} params
 */
export function initFocusSection(params: FocusSectionParams) {
  const { createFocusHelpers } = params;
  const { focusList, focusTree, focusTreeTop } = createFocusHelpers({
    getListEl: params.getListEl,
    getTreeEl: params.getTreeEl,
    getTreeBodyEl: params.getTreeBodyEl,
    getTreeFocusedIndex: params.getTreeFocusedIndex,
    getTreeRoot: params.getTreeRoot,
    setTreeFocusedIndex: params.setTreeFocusedIndex,
    scrollTreeToFocus: params.scrollTreeToFocus,
  });
  params.setFocusList(focusList);
  params.setFocusTree(focusTree);
  params.setFocusTreeTop(focusTreeTop);
  params.markReady("focusList");
  params.markReady("focusTree");
  params.markReady("focusTreeTop");
}
