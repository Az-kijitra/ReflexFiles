/**
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.actions
 * @param {object} params.helpers
 */
export function buildPathBarViewInputs({ state, actions, helpers }) {
  return {
    t: helpers.t,
    currentPath: state.currentPath,
    pathHistory: state.pathHistory,
    showTree: state.showTree,
    treeEl: state.treeEl,
    loadDir: actions.loadDir,
    focusList: actions.focusList,
    focusTreeTop: actions.focusTreeTop,
    handlePathTabCompletion: actions.handlePathTabCompletion,
    handlePathCompletionSeparator: actions.handlePathCompletionSeparator,
    handlePathCompletionInputChange: actions.handlePathCompletionInputChange,
    clearPathCompletionPreview: actions.clearPathCompletionPreview,
    setStatusMessage: actions.setStatusMessage,
  };
}
