import { buildPageActionsPropertiesInputsFromVars } from "./page_actions_properties_inputs_from_vars";

/**
 * @param {{
 *   state: any;
 *   refs: {
 *     propertiesModalEl: HTMLElement | null;
 *     propertiesCloseButton: HTMLElement | null;
 *   };
 *   get: {
 *     dirStatsRequestId: () => number;
 *   };
 *   set: {
 *     dirStatsRequestId: (value: number) => void;
 *   };
 * }} params
 */
export function buildPageActionsPropertiesInputsFromState(params) {
  const { state, refs, get, set } = params;

  return buildPageActionsPropertiesInputsFromVars({
    get: {
      propertiesData: () => state.propertiesData,
      propertiesOpen: () => state.propertiesOpen,
      propertiesPath: () => state.propertiesPath,
      propertiesModalEl: () => refs.propertiesModalEl,
      propertiesCloseButton: () => refs.propertiesCloseButton,
      dirStatsTimeoutMs: () => state.dirStatsTimeoutMs,
      dirStatsRequestId: () => get.dirStatsRequestId(),
      dirStatsInFlight: () => state.dirStatsInFlight,
    },
    set: {
      propertiesData: (value) => {
        state.propertiesData = value;
      },
      propertiesOpen: (value) => {
        state.propertiesOpen = value;
      },
      propertiesPath: (value) => {
        state.propertiesPath = value;
      },
      dirStatsTimeoutMs: (value) => {
        state.dirStatsTimeoutMs = value;
      },
      dirStatsRequestId: (value) => {
        set.dirStatsRequestId(value);
      },
      dirStatsInFlight: (value) => {
        state.dirStatsInFlight = value;
      },
    },
  });
}
