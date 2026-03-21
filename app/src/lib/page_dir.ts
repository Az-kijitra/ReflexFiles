import { PATH_HISTORY_LIMIT } from "$lib/page_constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DirHelpersParams {
  invoke:          (command: string, payload?: Record<string, unknown>) => Promise<unknown>;
  getShowHidden:   () => boolean;
  getSortKey:      () => string;
  getSortOrder:    () => string;
  setEntries:      (value: unknown[]) => void;
  setCurrentPath:  (value: string) => void;
  setPathInput:    (value: string) => void;
  scheduleWatch:   (path: string) => void;
  setSelectedPaths:(value: string[]) => void;
  setFocusedIndex: (value: number) => void;
  setAnchorIndex:  (value: number | null) => void;
  getPathHistory:  () => string[];
  setPathHistory:  (value: string[]) => void;
  scheduleUiSave:  () => void;
  getShowTree:     () => boolean;
  buildTreeRoot:   (path: string) => Promise<void>;
  clearTree:       () => void;
  setLoading:      (value: boolean) => void;
  setError:        (value: string) => void;
  showError:       (err: unknown) => void;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createDirHelpers(params: DirHelpersParams) {
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

  // loadSeq: incremented on every call; stale responses are dropped when the
  // counter has advanced (i.e. a newer loadDir call was made before this one finished).
  let loadSeq = 0;

  async function loadDir(path: string): Promise<void> {
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
      setEntries(items as unknown[]);
      setCurrentPath(path);
      setPathInput(path);
      scheduleWatch(path);
      setSelectedPaths([]);
      setFocusedIndex(0);
      setAnchorIndex(null);
      if (path) {
        const next = [path, ...getPathHistory().filter((p) => p !== path)];
        setPathHistory(next.slice(0, PATH_HISTORY_LIMIT));
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
