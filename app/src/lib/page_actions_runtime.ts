import { buildPageActionsBundleInputsFromVars } from "./page_actions_bundle_inputs_from_vars";
import { buildPageActionsPage } from "./page_actions_page";
import { buildPageActionsProperties } from "./page_actions_properties";
import { buildPageActionsPropertiesInputsFromState } from "./page_actions_properties_inputs_from_state";
import { setupPageActionsBundle } from "./page_actions_setup";

/**
 * @param {{
 *   t: (key: string, params?: Record<string, string | number>) => string;
 *   tick: () => Promise<void>;
 *   state: any;
 *   propertiesRefs: {
 *     propertiesModalEl: HTMLElement | null;
 *     propertiesCloseButton: HTMLElement | null;
 *   };
 *   getDirStatsRequestId: () => number;
 *   setDirStatsRequestId: (value: number) => void;
 *   pageState: any;
 *   pageSetters: any;
 *   pageRefs: any;
 *   pageDeps: any;
 *   showError: (err: unknown) => void;
 *   cacheGetDirStats: (path: string) => any;
 *   cacheSetDirStats: (path: string, value: any) => void;
 * }} params
 */
export function setupPageActionsRuntime(params) {
  return setupPageActionsBundle(
    buildPageActionsBundleInputsFromVars({
      t: params.t,
      tick: params.tick,
      properties: buildPageActionsProperties(
        buildPageActionsPropertiesInputsFromState({
          state: params.state,
          refs: {
            propertiesModalEl: params.propertiesRefs.propertiesModalEl,
            propertiesCloseButton: params.propertiesRefs.propertiesCloseButton,
          },
          get: {
            dirStatsRequestId: params.getDirStatsRequestId,
          },
          set: {
            dirStatsRequestId: params.setDirStatsRequestId,
          },
        })
      ),
      helpers: {
        showError: params.showError,
        cacheGetDirStats: params.cacheGetDirStats,
        cacheSetDirStats: params.cacheSetDirStats,
      },
      page: buildPageActionsPage({
        state: params.pageState,
        set: params.pageSetters,
        refs: params.pageRefs,
        deps: params.pageDeps,
      }),
    })
  );
}
