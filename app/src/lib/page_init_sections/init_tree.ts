import { TreeSectionParams } from "./types";

/**
 * @param {TreeSectionParams} params
 */
export function initTreeSection(params: TreeSectionParams) {
  const { createTreeHelpers } = params;
  const {
    expandTreeNode,
    buildTreeRoot,
    selectTreeNode,
    toggleTreeNode,
    handleTreeKey,
  } = createTreeHelpers({
    invoke: params.invoke,
    getShowHidden: params.getShowHidden,
    showError: params.showError,
    createTreeNode: params.createTreeNode,
    isTreeListIgnorableError: params.isTreeListIgnorableError,
    autoExpandDepth: params.autoExpandDepth,
    setTreeRoot: params.setTreeRoot,
    setTreeSelectedPath: params.setTreeSelectedPath,
    setTreeFocusedIndex: params.setTreeFocusedIndex,
    getTreeBodyEl: params.getTreeBodyEl,
    scrollTreeToFocus: params.scrollTreeToFocus,
    getCurrentPath: params.getCurrentPath,
    getLoadDir: params.getLoadDir,
    setTreeLoading: params.setTreeLoading,
    handleTreeKeyUtil: params.handleTreeKeyUtil,
    matchesAction: params.matchesAction,
    getTreeFocusedIndex: params.getTreeFocusedIndex,
    getTreeEl: params.getTreeEl,
    getTreeRootSafe: params.getTreeRootSafe,
    getTreePageStep: params.getTreePageStep,
    findTreeParentIndex: params.findTreeParentIndex,
    getVisibleTreeNodes: params.getVisibleTreeNodes,
  });
  params.setExpandTreeNode(expandTreeNode);
  params.setBuildTreeRoot(buildTreeRoot);
  params.setSelectTreeNode(selectTreeNode);
  params.setToggleTreeNode(toggleTreeNode);
  params.setHandleTreeKey(handleTreeKey);
  params.markReady("buildTreeRoot");
  params.markReady("expandTreeNode");
  params.markReady("selectTreeNode");
  params.markReady("toggleTreeNode");
  params.markReady("handleTreeKey");
}
