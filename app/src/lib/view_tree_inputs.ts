/**
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.actions
 * @param {object} params.helpers
 */
export function buildTreeViewInputs({ state, actions, helpers }) {
  return {
    treeLoading: state.treeLoading,
    treeRoot: state.treeRoot,
    treeSelectedPath: state.treeSelectedPath,
    treeFocusedIndex: state.treeFocusedIndex,
    t: helpers.t,
    getVisibleTreeNodes: actions.getVisibleTreeNodes,
    focusTree: actions.focusTree,
    selectTreeNode: actions.selectTreeNode,
    toggleTreeNode: actions.toggleTreeNode,
  };
}
