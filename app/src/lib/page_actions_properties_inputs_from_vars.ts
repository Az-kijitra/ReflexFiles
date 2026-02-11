/**
 * @param {{
 *   get: {
 *     propertiesData: () => import("$lib/types").Properties | null;
 *     propertiesOpen: () => boolean;
 *     propertiesPath: () => string;
 *     propertiesModalEl: () => HTMLElement | null;
 *     propertiesCloseButton: () => HTMLElement | null;
 *     dirStatsTimeoutMs: () => number;
 *     dirStatsRequestId: () => number;
 *     dirStatsInFlight: () => boolean;
 *   };
 *   set: {
 *     propertiesData: (value: import("$lib/types").Properties | null) => void;
 *     propertiesOpen: (value: boolean) => void;
 *     propertiesPath: (value: string) => void;
 *     dirStatsTimeoutMs: (value: number) => void;
 *     dirStatsRequestId: (value: number) => void;
 *     dirStatsInFlight: (value: boolean) => void;
 *   };
 * }} params
 */
export function buildPageActionsPropertiesInputsFromVars(params) {
  return {
    getPropertiesData: () => params.get.propertiesData(),
    setPropertiesData: (value) => {
      params.set.propertiesData(value);
    },
    getPropertiesOpen: () => params.get.propertiesOpen(),
    setPropertiesOpen: (value) => {
      params.set.propertiesOpen(value);
    },
    getPropertiesPath: () => params.get.propertiesPath(),
    setPropertiesPath: (value) => {
      params.set.propertiesPath(value);
    },
    getPropertiesModalEl: () => params.get.propertiesModalEl(),
    getPropertiesCloseButton: () => params.get.propertiesCloseButton(),
    getDirStatsTimeoutMs: () => params.get.dirStatsTimeoutMs(),
    setDirStatsTimeoutMs: (value) => {
      params.set.dirStatsTimeoutMs(value);
    },
    getDirStatsRequestId: () => params.get.dirStatsRequestId(),
    setDirStatsRequestId: (value) => {
      params.set.dirStatsRequestId(value);
    },
    getDirStatsInFlight: () => params.get.dirStatsInFlight(),
    setDirStatsInFlight: (value) => {
      params.set.dirStatsInFlight(value);
    },
  };
}
