/**
 * @param {object} ctx
 * @param {object} helpers
 * @param {(err: unknown) => void} helpers.showError
 * @param {(path: string) => import("$lib/types").DirStats | null} helpers.cacheGetDirStats
 * @param {(path: string, stats: import("$lib/types").DirStats) => void} helpers.cacheSetDirStats
 */
export function createPropertiesActions(ctx, helpers) {
  const { showError, cacheGetDirStats, cacheSetDirStats } = helpers;

  /** @param {string} path */
  async function openProperties(path) {
    if (!path) return;
    try {
      if (ctx.getDirStatsInFlight()) {
        ctx.setDirStatsRequestId(ctx.getDirStatsRequestId() + 1);
        ctx.setDirStatsInFlight(false);
      }
      const data = await ctx.invoke("fs_get_properties", { path });
      ctx.setPropertiesPath(path);
      const cached = cacheGetDirStats(path);
      ctx.setPropertiesData(
        cached
          ? {
              ...data,
              size: cached.size,
              files: cached.files,
              dirs: cached.dirs,
              dir_stats_pending: false,
              dir_stats_timeout: false,
              dir_stats_canceled: false,
            }
          : data
      );
      ctx.setPropertiesOpen(true);
      await ctx.tick();
      const closeButton = ctx.getPropertiesCloseButton();
      if (closeButton) {
        closeButton.focus({ preventScroll: true });
      } else {
        ctx.getPropertiesModalEl()?.focus();
      }
      if (data.type === "dir") {
        if (!cached) {
          startDirStats(path);
        }
      }
    } catch (err) {
      showError(err);
    }
  }

  function closeProperties() {
    ctx.setPropertiesOpen(false);
    ctx.setPropertiesData(null);
    ctx.setPropertiesPath("");
    ctx.setDirStatsRequestId(ctx.getDirStatsRequestId() + 1);
    ctx.setDirStatsInFlight(false);
  }

  /** @param {string} path */
  async function startDirStats(path) {
    if (!path) return;
    const requestId = ctx.getDirStatsRequestId() + 1;
    ctx.setDirStatsRequestId(requestId);
    ctx.setDirStatsInFlight(true);
    const current = ctx.getPropertiesData();
    ctx.setPropertiesData({
      ...current,
      dir_stats_pending: true,
      dir_stats_timeout: false,
      dir_stats_canceled: false,
    });
    try {
      const stats = await ctx.invoke("fs_dir_stats", {
        path,
        timeoutMs: ctx.getDirStatsTimeoutMs(),
      });
      if (!ctx.getPropertiesOpen() || ctx.getPropertiesPath() !== path) return;
      if (requestId !== ctx.getDirStatsRequestId()) return;
      ctx.setDirStatsInFlight(false);
      if (stats.timed_out) {
        ctx.setPropertiesData({
          ...ctx.getPropertiesData(),
          dir_stats_pending: false,
          dir_stats_timeout: true,
          dir_stats_canceled: false,
        });
        return;
      }
      cacheSetDirStats(path, {
        size: stats.size,
        files: stats.files,
        dirs: stats.dirs,
      });
      ctx.setPropertiesData({
        ...ctx.getPropertiesData(),
        size: stats.size,
        files: stats.files,
        dirs: stats.dirs,
        dir_stats_pending: false,
        dir_stats_timeout: false,
        dir_stats_canceled: false,
      });
    } catch (err) {
      ctx.setDirStatsInFlight(false);
      showError(err);
    }
  }

  function cancelDirStats() {
    if (!ctx.getDirStatsInFlight()) return;
    ctx.setDirStatsRequestId(ctx.getDirStatsRequestId() + 1);
    ctx.setDirStatsInFlight(false);
    ctx.setPropertiesData({
      ...ctx.getPropertiesData(),
      dir_stats_pending: false,
      dir_stats_timeout: false,
      dir_stats_canceled: true,
    });
  }

  function retryDirStats() {
    const data = ctx.getPropertiesData();
    if (!data || data.type !== "dir") return;
    startDirStats(ctx.getPropertiesPath());
  }

  async function saveDirStatsTimeout() {
    const timeout = ctx.getDirStatsTimeoutMs();
    if (!timeout || Number.isNaN(timeout)) return;
    const value = Math.max(500, Math.floor(timeout));
    ctx.setDirStatsTimeoutMs(value);
    try {
      await ctx.invoke("config_set_dir_stats_timeout", { timeoutMs: value });
    } catch (err) {
      showError(err);
    }
  }

  return {
    openProperties,
    closeProperties,
    startDirStats,
    cancelDirStats,
    retryDirStats,
    saveDirStatsTimeout,
  };
}
