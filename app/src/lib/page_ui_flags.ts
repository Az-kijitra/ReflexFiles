/**
 * @param {object} params
 * @param {() => boolean} params.getShowHidden
 * @param {(value: boolean) => void} params.setShowHidden
 * @param {() => boolean} params.getShowTree
 * @param {(value: boolean) => void} params.setShowTree
 * @param {() => "light" | "dark"} params.getTheme
 * @param {(value: "light" | "dark") => void} params.setTheme
 * @param {() => () => void} params.getScheduleUiSave
 * @param {() => (path: string) => Promise<void>} params.getLoadDir
 * @param {() => string} params.getCurrentPath
 * @param {() => () => void} params.getFocusList
 * @param {() => (path: string) => Promise<void>} params.getBuildTreeRoot
 * @param {() => () => void} params.getUpdateListRows
 * @param {() => Promise<void>} params.tick
 * @param {() => (err: unknown) => void} params.getShowError
 */
export function createUiFlagHelpers(params) {
  const {
    getShowHidden,
    setShowHidden,
    getShowTree,
    setShowTree,
    getTheme,
    setTheme,
    getScheduleUiSave,
    getLoadDir,
    getCurrentPath,
    getFocusList,
    getBuildTreeRoot,
    getUpdateListRows,
    tick,
    getShowError,
  } = params;

  function toggleHidden() {
    setShowHidden(!getShowHidden());
    getScheduleUiSave()();
    getLoadDir()(getCurrentPath());
  }

  function toggleTree() {
    setShowTree(!getShowTree());
    if (!getShowTree()) {
      getFocusList()();
    } else {
      getBuildTreeRoot()(getCurrentPath()).catch((err) => getShowError()(err));
    }
    tick().then(() => getUpdateListRows()());
    getScheduleUiSave()();
  }

  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
    getScheduleUiSave()();
  }

  return {
    toggleHidden,
    toggleTree,
    toggleTheme,
  };
}
