import { buildPageEffectConfigsFromState } from "./page_effect_configs_from_state";
import { buildModalConfigsFromState } from "./page_modal_configs_from_state";

/**
 * @param {{
 *   state: any;
 *   refs: {
 *     listBodyEl: HTMLElement | null;
 *     listEl: HTMLElement | null;
 *     dropdownEl: HTMLElement | null;
 *     deleteModalEl: HTMLElement | null;
 *     pasteModalEl: HTMLElement | null;
 *     failureModalEl: HTMLElement | null;
 *     zipModalEl: HTMLElement | null;
 *     aboutModalEl: HTMLElement | null;
 *     renameInputEl: HTMLInputElement | null;
 *     renameModalEl: HTMLElement | null;
 *     createInputEl: HTMLInputElement | null;
 *     createModalEl: HTMLElement | null;
 *     jumpUrlInputEl: HTMLInputElement | null;
 *     jumpUrlModalEl: HTMLElement | null;
 *     propertiesModalEl: HTMLElement | null;
 *     propertiesCloseButton: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
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
export function createPageEffectsRuntime(params) {
  const { listEffectConfig, dropdownEffectConfig, themeEffectConfig } =
    buildPageEffectConfigsFromState({
      state: params.state,
      refs: {
        listBodyEl: params.refs.listBodyEl,
        listEl: params.refs.listEl,
        dropdownEl: params.refs.dropdownEl,
      },
      actions: params.actions,
      deps: params.deps,
    });

  const { modalFocusConfig, modalInputFocusConfig, modalTrapConfig } =
    buildModalConfigsFromState({
      state: params.state,
      refs: params.refs,
      deps: { tick: params.deps.tick },
    });

  return {
    listEffectConfig,
    dropdownEffectConfig,
    themeEffectConfig,
    modalFocusConfig,
    modalInputFocusConfig,
    modalTrapConfig,
  };
}
