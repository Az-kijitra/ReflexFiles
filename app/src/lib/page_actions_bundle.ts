import { buildPageActionsStateFromVars } from "./page_actions_context";
import { buildPageActionsStateVarsFromState } from "./page_actions_state_vars_from_state";
import { buildPageActionsRefsFromVars } from "./page_actions_refs_from_vars";
import { buildPageActionsDeps } from "./page_actions_deps";
import { buildPageSetters } from "./page_setters";
import { buildPageSettersInputsFromState } from "./page_setters_inputs_from_state";
import { setupPageActionsRuntime } from "./page_actions_runtime";
import { buildPageActionGroups } from "./page_action_groups";

/**
 * @param {{
 *   state: any;
 *   statusTimer: ReturnType<typeof setTimeout> | null;
 *   setStatusTimer: (value: ReturnType<typeof setTimeout> | null) => void;
 *   refs: Parameters<typeof buildPageActionsRefsFromVars>[0];
 *   scheduleUiSave: () => void;
 *   getLoadDir: () => (path: string) => Promise<void>;
 *   getMoveFocusByRow: () => (delta: number, useRange: boolean) => void;
 *   undoLimit: number;
 *   zipPasswordMaxAttempts: number;
 *   t: (key: string, params?: Record<string, string | number>) => string;
 *   tick: typeof import("svelte").tick;
 *   propertiesRefs: {
 *     propertiesModalEl: HTMLElement | null;
 *     propertiesCloseButton: HTMLElement | null;
 *   };
 *   getDirStatsRequestId: () => number;
 *   setDirStatsRequestId: (value: number) => void;
 *   showError: (err: unknown) => void;
 *   cacheGetDirStats: (path: string) => any;
 *   cacheSetDirStats: (path: string, value: any) => void;
 * }} params
 */
export function setupPageActionsBundle(params) {
  const pageSetters = buildPageSetters(
    buildPageSettersInputsFromState({
      state: params.state,
      setStatusTimer: params.setStatusTimer,
    })
  );

  const pageState = buildPageActionsStateFromVars(() =>
    buildPageActionsStateVarsFromState({
      state: params.state,
      statusTimer: params.statusTimer,
    })
  );

  const pageRefs = buildPageActionsRefsFromVars(params.refs);

  const pageDeps = buildPageActionsDeps({
    scheduleUiSave: params.scheduleUiSave,
    getLoadDir: params.getLoadDir,
    getMoveFocusByRow: params.getMoveFocusByRow,
    undoLimit: params.undoLimit,
    zipPasswordMaxAttempts: params.zipPasswordMaxAttempts,
  });

  const { propertiesActions, pageActions } = setupPageActionsRuntime({
    t: params.t,
    tick: params.tick,
    state: params.state,
    propertiesRefs: params.propertiesRefs,
    getDirStatsRequestId: params.getDirStatsRequestId,
    setDirStatsRequestId: params.setDirStatsRequestId,
    pageState,
    pageSetters,
    pageRefs,
    pageDeps,
    showError: params.showError,
    cacheGetDirStats: params.cacheGetDirStats,
    cacheSetDirStats: params.cacheSetDirStats,
  });

  return {
    pageActions,
    propertiesActions,
    pageActionGroups: buildPageActionGroups({ pageActions, propertiesActions }),
  };
}
