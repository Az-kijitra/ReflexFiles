/**
 * @param {object} params
 */
export function buildListEffectConfig(params) {
  return {
    listBodyEl: params.listBodyEl,
    listEl: params.listEl,
    updateListRows: params.updateListRows,
    updateOverflowMarkers: params.updateOverflowMarkers,
    updateVisibleColumns: params.updateVisibleColumns,
    getActualColumnSpan: params.getActualColumnSpan,
  };
}

/**
 * @param {object} params
 */
export function buildDropdownEffectConfig(params) {
  return {
    dropdownOpen: params.dropdownOpen,
    tick: params.tick,
    dropdownEl: params.dropdownEl,
    dropdownIndex: params.dropdownIndex,
    scrollDropdownToIndex: params.scrollDropdownToIndex,
  };
}

/**
 * @param {object} params
 */
export function buildThemeEffectConfig(params) {
  return {
    uiConfigLoaded: params.uiConfigLoaded,
    uiTheme: params.uiTheme,
    invoke: params.invoke,
    showError: params.showError,
  };
}
