/**
 * @param {"history" | "jump"} dropdownMode
 * @param {import("$lib/types").JumpItem[]} jumpList
 * @param {string[]} pathHistory
 * @param {(mode: "history" | "jump", jumpList: import("$lib/types").JumpItem[], pathHistory: string[]) => import("$lib/types").JumpItem[]} buildDropdownItems
 */
export function computeDropdownItems(dropdownMode, jumpList, pathHistory, buildDropdownItems) {
  return buildDropdownItems(dropdownMode, jumpList, pathHistory);
}

/**
 * @param {number} dropdownIndex
 * @param {number} itemsLength
 */
export function clampDropdownIndex(dropdownIndex, itemsLength) {
  if (itemsLength <= 0) return 0;
  return Math.max(0, Math.min(dropdownIndex, itemsLength - 1));
}

/**
 * @param {boolean} dropdownOpen
 * @param {() => Promise<void>} tick
 * @param {HTMLElement | null} dropdownEl
 */
export async function focusDropdownOnOpen(dropdownOpen, tick, dropdownEl) {
  if (!dropdownOpen) return;
  await tick();
  dropdownEl?.focus();
}

/**
 * @param {boolean} dropdownOpen
 * @param {() => Promise<void>} tick
 * @param {HTMLElement | null} dropdownEl
 * @param {number} dropdownIndex
 * @param {(index: number) => void} scrollDropdownToIndex
 */
export async function scrollDropdownOnOpen(
  dropdownOpen,
  tick,
  dropdownEl,
  dropdownIndex,
  scrollDropdownToIndex
) {
  if (!dropdownOpen || !dropdownEl) return;
  await tick();
  scrollDropdownToIndex(dropdownIndex);
}
