import { buildOverlayBindingsInputsFromVars } from "./page_overlay_bindings_inputs_from_vars";
import { buildOverlayStateFromState } from "./page_overlay_state_from_state";

/**
 * @param {{
 *   state: any;
 *   refs: object | (() => object);
 *   setRefs: {
 *     dropdownEl: (value: HTMLElement | null) => void;
 *     searchInputEl: (value: HTMLInputElement | null) => void;
 *     sortMenuEl: (value: HTMLElement | null) => void;
 *     aboutModalEl: (value: HTMLElement | null) => void;
 *     deleteModalEl: (value: HTMLElement | null) => void;
 *     pasteModalEl: (value: HTMLElement | null) => void;
 *     createModalEl: (value: HTMLElement | null) => void;
 *     createInputEl: (value: HTMLInputElement | null) => void;
 *     jumpUrlModalEl: (value: HTMLElement | null) => void;
 *     jumpUrlInputEl: (value: HTMLInputElement | null) => void;
 *     renameModalEl: (value: HTMLElement | null) => void;
 *     renameInputEl: (value: HTMLInputElement | null) => void;
 *     propertiesModalEl: (value: HTMLElement | null) => void;
 *     propertiesCloseButton: (value: HTMLElement | null) => void;
 *     zipModalEl: (value: HTMLElement | null) => void;
 *     contextMenuEl: (value: HTMLElement | null) => void;
 *     failureModalEl: (value: HTMLElement | null) => void;
 *   };
 * }} params
 */
export function buildOverlayBindingsInputsFromState(params) {
  const getRefs = typeof params.refs === "function" ? params.refs : () => params.refs;

  return buildOverlayBindingsInputsFromVars({
    state: () => buildOverlayStateFromState({ state: params.state, refs: getRefs() }),
    set: {
      dropdownEl: params.setRefs.dropdownEl,
      dropdownMode: (value) => {
        params.state.dropdownMode = value;
      },
      dropdownOpen: (value) => {
        params.state.dropdownOpen = value;
      },
      dropdownIndex: (value) => {
        params.state.dropdownIndex = value;
      },
      searchQuery: (value) => {
        params.state.searchQuery = value;
      },
      searchRegex: (value) => {
        params.state.searchRegex = value;
      },
      searchInputEl: params.setRefs.searchInputEl,
      sortMenuIndex: (value) => {
        params.state.sortMenuIndex = value;
      },
      sortMenuEl: params.setRefs.sortMenuEl,
      aboutModalEl: params.setRefs.aboutModalEl,
      deleteModalEl: params.setRefs.deleteModalEl,
      deleteConfirmIndex: (value) => {
        params.state.deleteConfirmIndex = value;
      },
      pasteModalEl: params.setRefs.pasteModalEl,
      pasteApplyAll: (value) => {
        params.state.pasteApplyAll = value;
      },
      pasteConfirmIndex: (value) => {
        params.state.pasteConfirmIndex = value;
      },
      createModalEl: params.setRefs.createModalEl,
      createInputEl: params.setRefs.createInputEl,
      createType: (value) => {
        params.state.createType = value;
      },
      createName: (value) => {
        params.state.createName = value;
      },
      jumpUrlModalEl: params.setRefs.jumpUrlModalEl,
      jumpUrlInputEl: params.setRefs.jumpUrlInputEl,
      jumpUrlValue: (value) => {
        params.state.jumpUrlValue = value;
      },
      jumpUrlError: (value) => {
        params.state.jumpUrlError = value;
      },
      renameModalEl: params.setRefs.renameModalEl,
      renameInputEl: params.setRefs.renameInputEl,
      renameValue: (value) => {
        params.state.renameValue = value;
      },
      propertiesModalEl: params.setRefs.propertiesModalEl,
      propertiesCloseButton: params.setRefs.propertiesCloseButton,
      dirStatsTimeoutMs: (value) => {
        params.state.dirStatsTimeoutMs = value;
      },
      zipModalEl: params.setRefs.zipModalEl,
      zipDestination: (value) => {
        params.state.zipDestination = value;
      },
      zipPassword: (value) => {
        params.state.zipPassword = value;
      },
      zipConfirmIndex: (value) => {
        params.state.zipConfirmIndex = value;
      },
      zipOverwriteConfirmed: (value) => {
        params.state.zipOverwriteConfirmed = value;
      },
      contextMenuEl: params.setRefs.contextMenuEl,
      failureModalEl: params.setRefs.failureModalEl,
    },
  });
}
