import { createFocusHelpers } from "../page_focus";
import { scrollTreeToFocus } from "../utils/tree";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildFocusSectionInputs(params, markReady) {
  return {
    createFocusHelpers,
    getListEl: params.state.getListEl,
    getTreeEl: params.state.getTreeEl,
    getTreeBodyEl: params.state.getTreeBodyEl,
    getTreeFocusedIndex: params.state.getTreeFocusedIndex,
    getTreeRoot: params.state.getTreeRoot,
    setTreeFocusedIndex: params.set.setTreeFocusedIndex,
    scrollTreeToFocus,
    setFocusList: params.set.setFocusList,
    setFocusTree: params.set.setFocusTree,
    setFocusTreeTop: params.set.setFocusTreeTop,
    markReady,
  };
}
