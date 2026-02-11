/**
 * @param {number} limit
 */
export function createDirStatsCache(limit) {
  /** @type {Map<string, import("$lib/types").DirStats>} */
  const cache = new Map();
  /** @type {string[]} */
  let keys = [];

  /**
   * @param {string} path
   * @param {import("$lib/types").DirStats} stats
   */
  function cacheSetDirStats(path, stats) {
    if (!path) return;
    if (cache.has(path)) {
      cache.delete(path);
      keys = keys.filter((k) => k !== path);
    }
    cache.set(path, stats);
    keys = [...keys, path];
    while (keys.length > limit) {
      const oldest = keys[0];
      keys = keys.slice(1);
      cache.delete(oldest);
    }
  }

  /** @param {string} path */
  function cacheGetDirStats(path) {
    if (!path) return null;
    const cached = cache.get(path);
    if (!cached) return null;
    // refresh LRU order
    cache.delete(path);
    cache.set(path, cached);
    keys = keys.filter((k) => k !== path);
    keys = [...keys, path];
    return cached;
  }

  function clearDirStatsCache() {
    cache.clear();
    keys = [];
  }

  return { cacheGetDirStats, cacheSetDirStats, clearDirStatsCache };
}
