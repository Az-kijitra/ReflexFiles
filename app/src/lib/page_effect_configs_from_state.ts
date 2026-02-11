import { buildPageEffectConfigs } from "./page_effects_setup";

/**
 * @param {{
 *   state: any;
 *   refs: {
 *     listBodyEl: HTMLElement | null;
 *     listEl: HTMLElement | null;
 *     dropdownEl: HTMLElement | null;
 *   };
 *   actions: {
 *     updateListRows: () => void;
 *     updateOverflowMarkers: () => void;
 *     updateVisibleColumns: () => void;
 *     getActualColumnSpan: (el: HTMLElement | null) => number;
 *     scrollDropdownToIndex: (index: number) => void;
 *   };
 *   deps: {
 *     tick: typeof import("svelte").tick;
 *     invoke: (command: string, args?: Record<string, any>) => Promise<any>;
 *     showError: (err: unknown) => void;
 *   };
 * }} params
 */
export function buildPageEffectConfigsFromState(params) {
  return buildPageEffectConfigs({
    list: {
      listBodyEl: params.refs.listBodyEl,
      listEl: params.refs.listEl,
      updateListRows: params.actions.updateListRows,
      updateOverflowMarkers: params.actions.updateOverflowMarkers,
      updateVisibleColumns: params.actions.updateVisibleColumns,
      getActualColumnSpan: params.actions.getActualColumnSpan,
    },
    dropdown: {
      dropdownOpen: params.state.dropdownOpen,
      tick: params.deps.tick,
      dropdownEl: params.refs.dropdownEl,
      dropdownIndex: params.state.dropdownIndex,
      scrollDropdownToIndex: params.actions.scrollDropdownToIndex,
    },
    theme: {
      uiConfigLoaded: params.state.uiConfigLoaded,
      uiTheme: params.state.ui_theme,
      invoke: params.deps.invoke,
      showError: params.deps.showError,
    },
  });
}
