/**
 * @param {string[]} selectedPaths
 * @param {string} path
 */
export function isPathSelected(selectedPaths, path) {
  return selectedPaths.includes(path);
}

/**
 * @param {import("$lib/types").Entry[]} entries
 * @param {string[]} selectedPaths
 * @param {number} index
 */
export function toggleSelectionAtIndex(entries, selectedPaths, index) {
  const path = entries[index]?.path;
  if (!path) return null;
  const set = new Set(selectedPaths);
  if (set.has(path)) {
    set.delete(path);
  } else {
    set.add(path);
  }
  return {
    selectedPaths: [...set],
    anchorIndex: index,
    focusedIndex: index,
  };
}

/**
 * @param {import("$lib/types").Entry[]} entries
 * @param {number} from
 * @param {number} to
 */
export function selectRangeByIndex(entries, from, to) {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const paths = [];
  for (let i = start; i <= end; i += 1) {
    const path = entries[i]?.path;
    if (path) paths.push(path);
  }
  return {
    selectedPaths: paths,
    focusedIndex: to,
    anchorIndex: from,
  };
}

/**
 * @param {import("$lib/types").Entry[]} entries
 * @param {number} focusedIndex
 */
export function selectAllEntries(entries, focusedIndex) {
  const paths = entries.map((entry) => entry.path).filter(Boolean);
  return {
    selectedPaths: paths,
    anchorIndex: 0,
    focusedIndex: paths.length ? Math.min(focusedIndex, paths.length - 1) : focusedIndex,
  };
}

export function clearSelectionState() {
  return {
    selectedPaths: [],
    anchorIndex: null,
  };
}

/**
 * @param {import("$lib/types").Entry[]} entries
 * @param {string[]} selectedPaths
 */
export function invertSelectionPaths(entries, selectedPaths) {
  const set = new Set(selectedPaths);
  const next = [];
  for (const entry of entries) {
    if (!entry?.path) continue;
    if (set.has(entry.path)) continue;
    next.push(entry.path);
  }
  return {
    selectedPaths: next,
    anchorIndex: null,
  };
}
