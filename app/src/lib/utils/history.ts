/**
 * @param {string} value
 */
export function isLikelyUrl(value) {
  const trimmed = value.trim();
  return /^https?:\/\/\S+$/i.test(trimmed);
}

/**
 * @param {string} currentPath
 * @param {import("$lib/types").JumpItem[]} jumpList
 * @param {number} limit
 */
export function addJumpPath(currentPath, jumpList, limit = 20) {
  if (!currentPath) return jumpList;
  const next = [
    { type: "path", value: currentPath },
    ...jumpList.filter((j) => j.value !== currentPath),
  ];
  return next.slice(0, limit);
}

/**
 * @param {string} url
 * @param {import("$lib/types").JumpItem[]} jumpList
 * @param {number} limit
 */
export function addJumpUrl(url, jumpList, limit = 20) {
  if (!url) return jumpList;
  const next = [
    { type: "url", value: url },
    ...jumpList.filter((j) => j.value !== url),
  ];
  return next.slice(0, limit);
}

/**
 * @param {import("$lib/types").JumpItem[]} jumpList
 * @param {string} value
 */
export function removeJumpValue(jumpList, value) {
  return jumpList.filter((j) => j.value !== value);
}

/**
 * @param {string[]} history
 * @param {string} value
 */
export function removeHistoryValue(history, value) {
  return history.filter((p) => p !== value);
}

/**
 * @param {"history" | "jump"} mode
 * @param {import("$lib/types").JumpItem[]} jumpList
 * @param {string[]} pathHistory
 */
export function buildDropdownItems(mode, jumpList, pathHistory) {
  return mode === "jump"
    ? jumpList
    : pathHistory.map((p) => ({ type: "path", value: p }));
}

/**
 * @param {string} query
 * @param {string[]} history
 * @param {number} limit
 */
export function updateSearchHistory(query, history, limit = 20) {
  if (!query) return history;
  const next = [query, ...history.filter((q) => q !== query)];
  return next.slice(0, limit);
}

/**
 * @param {import("$lib/types").Entry[]} entries
 * @param {object} options
 * @param {boolean} options.searchActive
 * @param {string} options.searchQuery
 * @param {boolean} options.searchRegex
 * @param {(key: string) => string} options.t
 */
export function applySearchFilter(entries, { searchActive, searchQuery, searchRegex, t }) {
  if (!searchActive || !searchQuery.trim()) {
    return { filteredEntries: entries, searchError: "" };
  }
  if (searchRegex) {
    try {
      const re = new RegExp(searchQuery.trim(), "i");
      return {
        filteredEntries: entries.filter((entry) => re.test(entry.name)),
        searchError: "",
      };
    } catch (err) {
      return {
        filteredEntries: entries,
        searchError: t("search.invalid_regex"),
      };
    }
  }
  const q = searchQuery.trim().toLowerCase();
  return {
    filteredEntries: entries.filter((entry) => entry.name.toLowerCase().includes(q)),
    searchError: "",
  };
}
