import { UiFlagsSectionParams } from "./types";

/**
 * @param {UiFlagsSectionParams} params
 */
export function initUiFlagsSection(params: UiFlagsSectionParams) {
  const { createUiFlagHelpers } = params;
  const { toggleHidden, toggleTree, toggleTheme } = createUiFlagHelpers({
    getShowHidden: params.getShowHidden,
    setShowHidden: params.setShowHidden,
    getShowTree: params.getShowTree,
    setShowTree: params.setShowTree,
    getTheme: params.getTheme,
    setTheme: params.setTheme,
    getScheduleUiSave: params.getScheduleUiSave,
    getLoadDir: params.getLoadDir,
    getCurrentPath: params.getCurrentPath,
    getFocusList: params.getFocusList,
    getBuildTreeRoot: params.getBuildTreeRoot,
    getUpdateListRows: params.getUpdateListRows,
    tick: params.tick,
    getShowError: params.getShowError,
  });
  params.setToggleHidden(toggleHidden);
  params.setToggleTree(toggleTree);
  params.setToggleTheme(toggleTheme);
  params.markReady("toggleHidden");
  params.markReady("toggleTree");
  params.markReady("toggleTheme");
}
