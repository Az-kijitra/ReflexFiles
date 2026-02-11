import { WatchSectionParams } from "./types";

/**
 * @param {WatchSectionParams} params
 */
export function initWatchSection(params: WatchSectionParams) {
  const { createWatchHelpers } = params;
  const { scheduleWatch } = createWatchHelpers({
    invoke: params.invoke,
    getWatchTimer: params.getWatchTimer,
    setWatchTimer: params.setWatchTimer,
  });
  params.setScheduleWatch(scheduleWatch);
  params.markReady("scheduleWatch");
}
