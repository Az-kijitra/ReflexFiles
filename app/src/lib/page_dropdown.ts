/**
 * @param {object} params
 * @param {() => string} params.getDropdownMode
 * @param {(value: string) => void} params.setDropdownMode
 * @param {() => boolean} params.getDropdownOpen
 * @param {(value: boolean) => void} params.setDropdownOpen
 * @param {() => HTMLElement | null} params.getDropdownEl
 * @param {() => unknown[]} params.getJumpList
 * @param {() => string[]} params.getPathHistory
 * @param {() => (message: string) => void} params.getSetStatusMessage
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {() => Promise<void>} params.tick
 */
export function createDropdownHelpers(params) {
  const {
    setDropdownMode,
    setDropdownOpen,
    getDropdownEl,
    getJumpList,
    getPathHistory,
    getSetStatusMessage,
    t,
    tick,
  } = params;

  function openJumpList() {
    if (!getJumpList() || getJumpList().length === 0) {
      getSetStatusMessage()(t("no_items"));
      return;
    }
    setDropdownMode("jump");
    setDropdownOpen(true);
    tick().then(() => getDropdownEl()?.focus());
  }

  function openHistoryList() {
    if (!getPathHistory() || getPathHistory().length === 0) {
      getSetStatusMessage()(t("no_items"));
      return;
    }
    setDropdownMode("history");
    setDropdownOpen(true);
    tick().then(() => getDropdownEl()?.focus());
  }

  return {
    openJumpList,
    openHistoryList,
  };
}
