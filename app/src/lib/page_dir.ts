/**
 * @param {object} params
 * @param {(command: string, payload?: Record<string, unknown>) => Promise<unknown>} params.invoke
 * @param {() => boolean} params.getShowHidden
 * @param {() => string} params.getSortKey
 * @param {() => string} params.getSortOrder
 * @param {(value: unknown[]) => void} params.setEntries
 * @param {(value: string) => void} params.setCurrentPath
 * @param {(value: string) => void} params.setPathInput
 * @param {() => void} params.scheduleWatch
 * @param {(value: string[]) => void} params.setSelectedPaths
 * @param {(value: number) => void} params.setFocusedIndex
 * @param {(value: number | null) => void} params.setAnchorIndex
 * @param {() => string[]} params.getPathHistory
 * @param {(value: string[]) => void} params.setPathHistory
 * @param {() => void} params.scheduleUiSave
 * @param {() => boolean} params.getShowTree
 * @param {(path: string) => Promise<void>} params.buildTreeRoot
 * @param {() => void} params.clearTree
 * @param {(value: boolean) => void} params.setLoading
 * @param {(value: string) => void} params.setError
 * @param {(err: unknown) => void} params.showError
 */
export function createDirHelpers(params) {
  const {
    invoke,
    getShowHidden,
    getSortKey,
    getSortOrder,
    setEntries,
    setCurrentPath,
    setPathInput,
    scheduleWatch,
    setSelectedPaths,
    setFocusedIndex,
    setAnchorIndex,
    getPathHistory,
    setPathHistory,
    scheduleUiSave,
    getShowTree,
    buildTreeRoot,
    clearTree,
    setLoading,
    setError,
    showError,
  } = params;

  let loadSeq = 0;

  /** @param {string} path */
  async function loadDir(path) {
    const seq = ++loadSeq;
    setLoading(true);
    setError("");
    try {
      const items = await invoke("fs_list_dir", {
        path,
        showHidden: getShowHidden(),
        sortKey: getSortKey(),
        sortOrder: getSortOrder(),
      });
      if (seq !== loadSeq) return;
      setEntries(items);
      setCurrentPath(path);
      setPathInput(path);
      scheduleWatch(path);
      setSelectedPaths([]);
      setFocusedIndex(0);
      setAnchorIndex(null);
      if (path) {
        const next = [path, ...getPathHistory().filter((p) => p !== path)];
        setPathHistory(next.slice(0, 50));
        scheduleUiSave();
      }
      if (getShowTree()) {
        buildTreeRoot(path).catch((err) => showError(err));
      } else {
        clearTree();
      }
    } catch (err) {
      if (seq !== loadSeq) return;
      showError(err);
    } finally {
      if (seq === loadSeq) {
        setLoading(false);
      }
    }
  }

  return { loadDir };
}
