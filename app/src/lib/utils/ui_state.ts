/**
 * @param {object} state
 * @param {boolean} state.uiConfigLoaded
 * @param {string} state.currentPath
 * @param {{ width: number, height: number }} state.windowBounds
 * @param {boolean} state.windowBoundsReady
 */
export function canSaveUiState(state) {
  return Boolean(state.uiConfigLoaded && state.currentPath);
}

/**
 * @param {object} args
 * @param {boolean} args.showHidden
 * @param {boolean} args.showSize
 * @param {boolean} args.showTime
 * @param {boolean} args.showTree
 * @param {string} args.sortKey
 * @param {string} args.sortOrder
 * @param {string[]} args.pathHistory
 * @param {import("$lib/types").JumpItem[]} args.jumpList
 * @param {string} args.currentPath
 * @param {string[]} args.searchHistory
 * @param {"light" | "dark"} args.ui_theme
 * @param {{ x: number, y: number, width: number, height: number, maximized: boolean }} args.windowBounds
 */
export function buildUiSnapshot(args) {
  const showHidden = Boolean(args.showHidden);
  const showSize = Boolean(args.showSize);
  const showTime = Boolean(args.showTime);
  const showTree = Boolean(args.showTree);
  const sortKey = args.sortKey ?? "name";
  const sortOrder = args.sortOrder ?? "asc";
  const pathHistory = args.pathHistory ?? [];
  const jumpList = args.jumpList ?? [];
  const searchHistory = args.searchHistory ?? [];
  const theme = args.ui_theme ?? "light";
  const windowBounds = args.windowBounds ?? { x: 0, y: 0, width: 0, height: 0, maximized: false };

  return {
    showHidden,
    showSize,
    showTime,
    showTree,
    sortKey,
    sortOrder,
    pathHistory,
    jumpList,
    lastPath: args.currentPath,
    searchHistory,
    theme,
    windowX: windowBounds.x ?? 0,
    windowY: windowBounds.y ?? 0,
    windowWidth: windowBounds.width ?? 0,
    windowHeight: windowBounds.height ?? 0,
    windowMaximized: Boolean(windowBounds.maximized),
  };
}

/**
 * @param {object} args
 * @param {number} args.delay
 * @param {() => boolean} args.canSave
 * @param {() => ReturnType<typeof setTimeout> | null} args.getTimer
 * @param {(value: ReturnType<typeof setTimeout> | null) => void} args.setTimer
 * @param {() => void} args.save
 */
export function scheduleUiSave(args) {
  if (!args.canSave()) return;
  const current = args.getTimer();
  if (current) {
    clearTimeout(current);
  }
  const timer = setTimeout(() => {
    args.save();
    args.setTimer(null);
  }, args.delay);
  args.setTimer(timer);
}
