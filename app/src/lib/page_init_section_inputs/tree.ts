import { TREE_AUTO_EXPAND_DEPTH, TREE_AUTO_EXPAND_ENTRY_LIMIT } from "../page_constants";
import { createTreeHelpers } from "../page_tree";
import {
  createTreeNode,
  findTreeParentIndex,
  getTreePageStep,
  getVisibleTreeNodes,
  handleTreeKey as handleTreeKeyUtil,
  isTreeListIgnorableError,
  scrollTreeToFocus,
} from "../utils/tree";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildTreeSectionInputs(params, markReady) {
  return {
    createTreeHelpers,
    invoke: params.deps.invoke,
    getShowHidden: params.state.getShowHidden,
    showError: params.values.showError,
    createTreeNode,
    isTreeListIgnorableError,
    autoExpandDepth: TREE_AUTO_EXPAND_DEPTH,
    autoExpandEntryLimit: TREE_AUTO_EXPAND_ENTRY_LIMIT,
    setTreeRoot: params.set.setTreeRoot,
    setTreeSelectedPath: params.set.setTreeSelectedPath,
    setTreeFocusedIndex: params.set.setTreeFocusedIndex,
    getTreeBodyEl: params.state.getTreeBodyElSafe,
    scrollTreeToFocus,
    getCurrentPath: params.state.getCurrentPath,
    getLoadDir: params.state.getLoadDir,
    setTreeLoading: params.set.setTreeLoading,
    handleTreeKeyUtil,
    matchesAction: params.values.matchesAction,
    getTreeFocusedIndex: params.state.getTreeFocusedIndexSafe,
    getTreeEl: params.state.getTreeElSafe,
    getTreeRootSafe: params.state.getTreeRootSafe,
    getTreePageStep,
    findTreeParentIndex,
    getVisibleTreeNodes,
    setExpandTreeNode: params.set.setExpandTreeNode,
    setBuildTreeRoot: params.set.setBuildTreeRoot,
    setSelectTreeNode: params.set.setSelectTreeNode,
    setToggleTreeNode: params.set.setToggleTreeNode,
    setHandleTreeKey: params.set.setHandleTreeKey,
    markReady,
  };
}
