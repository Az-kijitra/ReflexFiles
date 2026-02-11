import { buildOverlayBindingsFromVars } from "./page_overlay_bindings_from_vars";
import { buildOverlayBindingsInputsFromState } from "./page_overlay_bindings_inputs_from_state";
import { buildOverlayStateFromState } from "./page_overlay_state_from_state";

/**
 * @param {{
 *   state: any;
 *   getRefs: () => {
 *     dropdownEl: HTMLElement | null;
 *     searchInputEl: HTMLInputElement | null;
 *     sortMenuEl: HTMLElement | null;
 *     aboutModalEl: HTMLElement | null;
 *     deleteModalEl: HTMLElement | null;
 *     pasteModalEl: HTMLElement | null;
 *     createModalEl: HTMLElement | null;
 *     createInputEl: HTMLInputElement | null;
 *     jumpUrlModalEl: HTMLElement | null;
 *     jumpUrlInputEl: HTMLInputElement | null;
 *     renameModalEl: HTMLElement | null;
 *     renameInputEl: HTMLInputElement | null;
 *     propertiesModalEl: HTMLElement | null;
 *     propertiesCloseButton: HTMLElement | null;
 *     zipModalEl: HTMLElement | null;
 *     contextMenuEl: HTMLElement | null;
 *     failureModalEl: HTMLElement | null;
 *   };
 *   setRefs: Parameters<typeof buildOverlayBindingsInputsFromState>[0]["setRefs"];
 * }} params
 */
export function createOverlayRuntime(params) {
  const getState = () =>
    buildOverlayStateFromState({ state: params.state, refs: params.getRefs() });

  const bindings = buildOverlayBindingsFromVars(
    buildOverlayBindingsInputsFromState({
      state: params.state,
      refs: params.getRefs,
      setRefs: params.setRefs,
    })
  );

  return { getState, bindings };
}
