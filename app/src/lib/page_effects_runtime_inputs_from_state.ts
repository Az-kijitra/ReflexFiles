/**
 * @param {{
 *   state: any;
 *   shellRefs: {
 *     listBodyEl: HTMLElement | null;
 *     listEl: HTMLElement | null;
 *   };
 *   overlayRefs: {
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
export function buildPageEffectsRuntimeInputsFromState(params) {
  return {
    state: params.state,
    refs: {
      ...params.overlayRefs,
      listBodyEl: params.shellRefs.listBodyEl,
      listEl: params.shellRefs.listEl,
    },
    actions: {
      updateListRows: params.actions.updateListRows,
      updateOverflowMarkers: params.actions.updateOverflowMarkers,
      updateVisibleColumns: params.actions.updateVisibleColumns,
      getActualColumnSpan: params.actions.getActualColumnSpan,
      scrollDropdownToIndex: params.actions.scrollDropdownToIndex,
    },
    deps: params.deps,
  };
}
