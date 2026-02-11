/**
 * @param {object} params
 * @param {(command: string, payload?: Record<string, unknown>) => Promise<unknown>} params.invoke
 * @param {() => ReturnType<typeof setTimeout> | null} params.getWatchTimer
 * @param {(value: ReturnType<typeof setTimeout> | null) => void} params.setWatchTimer
 */
export function createWatchHelpers(params) {
  const { invoke, getWatchTimer, setWatchTimer } = params;

  /** @param {string} path */
  function scheduleWatch(path) {
    if (!path) return;
    const timer = getWatchTimer();
    if (timer) {
      clearTimeout(timer);
    }
    const nextTimer = setTimeout(() => {
      invoke("fs_watch_start", { path }).catch(() => {});
      setWatchTimer(null);
    }, 200);
    setWatchTimer(nextTimer);
  }

  return { scheduleWatch };
}
