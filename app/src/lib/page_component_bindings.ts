/**
 * @param {object} params
 * @param {object} params.state
 */
export function buildPathBarBindings({ state }) {
  return {
    pathInput: state.pathInput,
    pathInputEl: state.pathInputEl,
    dropdownMode: state.dropdownMode,
    dropdownOpen: state.dropdownOpen,
  };
}

/**
 * @param {object} params
 * @param {object} params.state
 */
export function buildTreePanelBindings({ state }) {
  return {
    treeEl: state.treeEl,
    treeBodyEl: state.treeBodyEl,
  };
}

/**
 * @param {object} params
 * @param {object} params.state
 */
export function buildFileListBindings({ state }) {
  return {
    listEl: state.listEl,
    listBodyEl: state.listBodyEl,
    focusedIndex: state.focusedIndex,
    anchorIndex: state.anchorIndex,
  };
}
