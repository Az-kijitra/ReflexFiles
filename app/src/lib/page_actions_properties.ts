/**
 * @param {{
 *   getPropertiesData: () => any;
 *   setPropertiesData: (value: any) => void;
 *   getPropertiesOpen: () => boolean;
 *   setPropertiesOpen: (value: boolean) => void;
 *   getPropertiesPath: () => string;
 *   setPropertiesPath: (value: string) => void;
 *   getPropertiesModalEl: () => HTMLElement | null;
 *   getPropertiesCloseButton: () => HTMLButtonElement | null;
 *   getDirStatsTimeoutMs: () => number;
 *   setDirStatsTimeoutMs: (value: number) => void;
 *   getDirStatsRequestId: () => number;
 *   setDirStatsRequestId: (value: number) => void;
 *   getDirStatsInFlight: () => boolean;
 *   setDirStatsInFlight: (value: boolean) => void;
 * }} params
 */
export function buildPageActionsProperties(params) {
  return {
    getPropertiesData: params.getPropertiesData,
    setPropertiesData: params.setPropertiesData,
    getPropertiesOpen: params.getPropertiesOpen,
    setPropertiesOpen: params.setPropertiesOpen,
    getPropertiesPath: params.getPropertiesPath,
    setPropertiesPath: params.setPropertiesPath,
    getPropertiesModalEl: params.getPropertiesModalEl,
    getPropertiesCloseButton: params.getPropertiesCloseButton,
    getDirStatsTimeoutMs: params.getDirStatsTimeoutMs,
    setDirStatsTimeoutMs: params.setDirStatsTimeoutMs,
    getDirStatsRequestId: params.getDirStatsRequestId,
    setDirStatsRequestId: params.setDirStatsRequestId,
    getDirStatsInFlight: params.getDirStatsInFlight,
    setDirStatsInFlight: params.setDirStatsInFlight,
  };
}
