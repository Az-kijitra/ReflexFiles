/**
 * @param {import("$lib/types").Entry[]} entries
 * @param {import("$lib/types").Entry[]} filteredEntries
 * @param {number} focusedIndex
 */
function getCurrentVisualIndex(entries, filteredEntries, focusedIndex) {
  const currentEntry = entries[focusedIndex];
  const currentVisual = currentEntry
    ? filteredEntries.findIndex((entry) => entry.path === currentEntry.path)
    : 0;
  return currentVisual >= 0 ? currentVisual : 0;
}

/**
 * @param {object} args
 * @param {import("$lib/types").Entry[]} args.entries
 * @param {import("$lib/types").Entry[]} args.filteredEntries
 * @param {number} args.focusedIndex
 * @param {number} args.delta
 */
export function getNextIndexByRow({ entries, filteredEntries, focusedIndex, delta }) {
  if (!filteredEntries.length) return null;
  const base = getCurrentVisualIndex(entries, filteredEntries, focusedIndex);
  const nextVisual = Math.min(
    filteredEntries.length - 1,
    Math.max(0, base + delta)
  );
  const targetEntry = filteredEntries[nextVisual];
  if (!targetEntry) return null;
  const targetIndex = entries.indexOf(targetEntry);
  if (targetIndex < 0) return null;
  return { targetIndex, targetVisual: nextVisual };
}

/**
 * @param {object} args
 * @param {import("$lib/types").Entry[]} args.entries
 * @param {import("$lib/types").Entry[]} args.filteredEntries
 * @param {number} args.focusedIndex
 * @param {number} args.offsetColumns
 * @param {number} args.rowsPerColumn
 */
export function getNextIndexByColumn({
  entries,
  filteredEntries,
  focusedIndex,
  offsetColumns,
  rowsPerColumn,
}) {
  if (!filteredEntries.length) return null;
  const base = getCurrentVisualIndex(entries, filteredEntries, focusedIndex);
  const step = Math.max(1, rowsPerColumn);
  const totalCols = Math.max(1, Math.ceil(filteredEntries.length / step));
  const currentCol = Math.floor(base / step);
  const targetCol = Math.min(Math.max(currentCol + offsetColumns, 0), totalCols - 1);
  const rowIndex = base % step;
  const colStart = targetCol * step;
  const remaining = filteredEntries.length - colStart;
  const colCount = Math.max(1, Math.min(step, remaining));
  const targetRow = Math.min(rowIndex, colCount - 1);
  const nextVisual = colStart + targetRow;
  const targetEntry = filteredEntries[nextVisual];
  if (!targetEntry) return null;
  const targetIndex = entries.indexOf(targetEntry);
  if (targetIndex < 0) return null;
  return { targetIndex, targetCol };
}
