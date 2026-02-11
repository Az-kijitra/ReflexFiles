/**
 * @param {object} params
 */
export function buildJumpHandlersParams(params) {
  return {
    dropdown: {
      setDropdownMode: params.setDropdownMode,
      setDropdownOpen: params.setDropdownOpen,
      getDropdownEl: params.getDropdownEl,
      getJumpList: params.getJumpList,
      getPathHistory: params.getPathHistory,
      getSetStatusMessage: params.getSetStatusMessage,
      t: params.t,
      tick: params.tick,
    },
    pathCompletion: {
      getCurrentPath: params.getCurrentPath,
      invoke: params.invoke,
      getShowHidden: params.getShowHidden,
      setPathInput: params.setPathInput,
      getSetStatusMessage: params.getSetStatusMessage,
      getShowError: params.getShowError,
      t: params.t,
      treeNodeName: params.treeNodeName,
    },
  };
}
