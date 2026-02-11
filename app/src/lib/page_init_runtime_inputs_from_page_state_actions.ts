/**
 * @param {object} params
 * @param {Record<string, any>} params.actions
 */
export function buildInitRuntimeActionsFromPageState(params) {
  return {
    loadDir: () => params.actions.loadDir,
    focusList: () => params.actions.focusList,
    buildTreeRoot: () => params.actions.buildTreeRoot,
    updateListRows: () => params.actions.updateListRows,
    scheduleUiSave: () => params.actions.scheduleUiSave,
    scheduleWatch: () => params.actions.scheduleWatch,
  };
}
