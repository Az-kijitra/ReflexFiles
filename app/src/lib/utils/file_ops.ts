import { normalizePathValue } from "$lib/utils/normalize";

/** @param {string} value */
export function basename(value) {
  if (!value) return "";
  return value.split(/[\\\/]/).pop() || "";
}

/**
 * @param {string} name
 * @param {Set<string>} existingLower
 * @param {string} suffix
 */
export function makeDuplicateName(name, existingLower, suffix) {
  const { stem, ext } = splitNameExt(name);
  let candidate = `${stem}${suffix}${ext}`;
  if (!existingLower.has(candidate.toLowerCase())) return candidate;
  for (let i = 2; i < 10000; i += 1) {
    candidate = `${stem}${suffix} (${i})${ext}`;
    if (!existingLower.has(candidate.toLowerCase())) return candidate;
  }
  return `${stem}${suffix} (${Date.now()})${ext}`;
}

/** @param {string} name */
export function splitNameExt(name) {
  if (!name) return { stem: "", ext: "" };
  const lastDot = name.lastIndexOf(".");
  if (lastDot > 0 && lastDot < name.length - 1) {
    return { stem: name.slice(0, lastDot), ext: name.slice(lastDot) };
  }
  return { stem: name, ext: "" };
}

/**
 * @param {string[]} paths
 * @param {string} destination
 */
export function buildPastePairs(paths, destination) {
  if (!destination) return [];
  const pairs = [];
  for (const path of paths) {
    const name = basename(path);
    if (!name) continue;
    pairs.push({ from: path, to: `${destination}\\${name}` });
  }
  return pairs;
}

/**
 * @param {string[]} paths
 * @param {import("$lib/types").Entry[]} entries
 */
export function getPasteConflicts(paths, entries) {
  if (!paths || !paths.length) return [];
  const existing = new Set(entries.map((e) => e.name));
  const conflicts = [];
  for (const p of paths) {
    const name = basename(p);
    if (name && existing.has(name)) {
      conflicts.push(name);
    }
  }
  return conflicts;
}

/**
 * @param {string} path
 * @param {string} currentPath
 */
export function isSamePathTarget(path, currentPath) {
  if (!path || !currentPath) return false;
  const name = basename(path);
  if (!name) return false;
  const target = `${currentPath}\\${name}`;
  return normalizePathValue(path) === normalizePathValue(target);
}

/**
 * @param {string[]} paths
 * @param {object} options
 * @param {string} options.currentPath
 * @param {import("$lib/types").Entry[]} options.entries
 * @param {(path: string) => string | null} options.getParentPath
 * @param {string} options.duplicateSuffix
 */
export function buildDuplicatePairs(paths, options) {
  const { currentPath, entries, getParentPath, duplicateSuffix } = options;
  const pairs = [];
  const sets = new Map();
  for (const path of paths) {
    const name = basename(path);
    if (!name) continue;
    const parent = getParentPath(path) || currentPath;
    if (!parent) continue;
    const parentKey = normalizePathValue(parent);
    let existing = sets.get(parentKey);
    if (!existing) {
      if (normalizePathValue(currentPath) === parentKey) {
        existing = new Set(entries.map((e) => e.name.toLowerCase()));
      } else {
        existing = new Set();
      }
      sets.set(parentKey, existing);
    }
    const nextName = makeDuplicateName(name, existing, duplicateSuffix);
    existing.add(nextName.toLowerCase());
    pairs.push({ from: path, to: `${parent}\\${nextName}` });
  }
  return pairs;
}
