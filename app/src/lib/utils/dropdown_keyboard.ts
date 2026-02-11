/**
 * @param {KeyboardEvent} event
 * @param {object} params
 * @param {boolean} params.dropdownOpen
 * @param {Array<any>} params.dropdownItems
 * @param {number} params.dropdownIndex
 * @param {"history" | "jump"} params.dropdownMode
 * @param {import("$lib/types").JumpItem[]} params.jumpList
 * @param {string[]} params.pathHistory
 * @param {(event: KeyboardEvent, action: string) => boolean} params.matchesAction
 * @param {(message: string, durationMs?: number) => void} params.setStatusMessage
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(mode: "history" | "jump") => void} params.setDropdownMode
 * @param {(value: number) => void} params.setDropdownIndex
 * @param {(value: boolean) => void} params.setDropdownOpen
 * @param {(index: number) => void} params.scrollDropdownToIndex
 * @param {(item: import("$lib/types").JumpItem) => void} params.selectDropdown
 * @param {(value: string) => void} params.removeHistory
 * @returns {boolean}
 */
export function handleDropdownKeydown(event, params) {
  if (!params.dropdownOpen) return false;

  const itemsLength = params.dropdownItems.length;
  const scheduleScroll = (index) => {
    requestAnimationFrame(() => params.scrollDropdownToIndex(index));
  };

  if (params.matchesAction(event, "history_jump_list")) {
    event.preventDefault();
    if (!params.jumpList || params.jumpList.length === 0) {
      params.setStatusMessage(params.t("no_items"));
      return true;
    }
    params.setDropdownMode("jump");
    params.setDropdownIndex(0);
    scheduleScroll(0);
    return true;
  }

  if (params.matchesAction(event, "history")) {
    event.preventDefault();
    if (!params.pathHistory || params.pathHistory.length === 0) {
      params.setStatusMessage(params.t("no_items"));
      return true;
    }
    params.setDropdownMode("history");
    params.setDropdownIndex(0);
    scheduleScroll(0);
    return true;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    params.setDropdownOpen(false);
    return true;
  }

  if (event.key === "Home") {
    event.preventDefault();
    if (itemsLength === 0) return true;
    params.setDropdownIndex(0);
    scheduleScroll(0);
    return true;
  }

  if (event.key === "End") {
    event.preventDefault();
    if (itemsLength === 0) return true;
    const nextIndex = itemsLength - 1;
    params.setDropdownIndex(nextIndex);
    scheduleScroll(nextIndex);
    return true;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    if (itemsLength === 0) return true;
    const nextIndex = Math.min(itemsLength - 1, params.dropdownIndex + 1);
    params.setDropdownIndex(nextIndex);
    scheduleScroll(nextIndex);
    return true;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    if (itemsLength === 0) return true;
    const nextIndex = Math.max(0, params.dropdownIndex - 1);
    params.setDropdownIndex(nextIndex);
    scheduleScroll(nextIndex);
    return true;
  }

  if (event.key === "PageDown") {
    event.preventDefault();
    if (itemsLength === 0) return true;
    const nextIndex = Math.min(itemsLength - 1, params.dropdownIndex + 10);
    params.setDropdownIndex(nextIndex);
    scheduleScroll(nextIndex);
    return true;
  }

  if (event.key === "PageUp") {
    event.preventDefault();
    if (itemsLength === 0) return true;
    const nextIndex = Math.max(0, params.dropdownIndex - 10);
    params.setDropdownIndex(nextIndex);
    scheduleScroll(nextIndex);
    return true;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (itemsLength === 0) return true;
    const item = params.dropdownItems[params.dropdownIndex];
    if (item) params.selectDropdown(item);
    return true;
  }

  if (event.key === "Delete" && params.dropdownMode === "history") {
    event.preventDefault();
    if (itemsLength === 0) return true;
    const item = params.dropdownItems[params.dropdownIndex];
    if (!item) return true;
    params.removeHistory(item.value);
    return true;
  }

  return false;
}
