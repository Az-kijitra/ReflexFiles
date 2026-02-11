import { createWatchHelpers } from "../page_watch";

/**
 * @param {any} params
 * @param {(name: string) => void} markReady
 */
export function buildWatchSectionInputs(params, markReady) {
  return {
    createWatchHelpers,
    invoke: params.deps.invoke,
    getWatchTimer: params.state.getWatchTimer,
    setWatchTimer: params.set.setWatchTimer,
    setScheduleWatch: params.set.setScheduleWatch,
    markReady,
  };
}
