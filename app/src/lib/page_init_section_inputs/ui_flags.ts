import { createUiFlagHelpers } from "../page_ui_flags";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildUiFlagsSectionInputs(params, markReady) {
  return {
    createUiFlagHelpers,
    getShowHidden: params.state.getShowHidden,
    setShowHidden: params.set.setShowHidden,
    getShowTree: params.state.getShowTree,
    setShowTree: params.set.setShowTree,
    getTheme: params.state.getTheme,
    setTheme: params.set.setTheme,
    getScheduleUiSave: params.state.getScheduleUiSave,
    getLoadDir: params.state.getLoadDir,
    getCurrentPath: params.state.getCurrentPath,
    getFocusList: params.state.getFocusList,
    getBuildTreeRoot: params.state.getBuildTreeRoot,
    getUpdateListRows: params.state.getUpdateListRows,
    tick: params.deps.tick,
    getShowError: params.state.getShowError,
    setToggleHidden: params.set.setToggleHidden,
    setToggleTree: params.set.setToggleTree,
    setToggleTheme: params.set.setToggleTheme,
    markReady,
  };
}
