import { buildModalConfigs } from "./page_modal_setup";

/**
 * @param {{
 *   state: any;
 *   refs: {
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
 *   deps: {
 *     tick: typeof import("svelte").tick;
 *   };
 * }} params
 */
export function buildModalConfigsFromState(params) {
  return buildModalConfigs({
    focus: {
      deleteConfirmOpen: params.state.deleteConfirmOpen,
      deleteModalEl: params.refs.deleteModalEl,
      pasteConfirmOpen: params.state.pasteConfirmOpen,
      pasteModalEl: params.refs.pasteModalEl,
      failureModalOpen: params.state.failureModalOpen,
      failureModalEl: params.refs.failureModalEl,
      zipModalOpen: params.state.zipModalOpen,
      zipModalEl: params.refs.zipModalEl,
      aboutOpen: params.state.aboutOpen,
      aboutModalEl: params.refs.aboutModalEl,
    },
    input: {
      renameOpen: params.state.renameOpen,
      tick: params.deps.tick,
      renameInputEl: params.refs.renameInputEl,
      renameModalEl: params.refs.renameModalEl,
      createOpen: params.state.createOpen,
      createInputEl: params.refs.createInputEl,
      createModalEl: params.refs.createModalEl,
      jumpUrlOpen: params.state.jumpUrlOpen,
      jumpUrlInputEl: params.refs.jumpUrlInputEl,
      jumpUrlModalEl: params.refs.jumpUrlModalEl,
    },
    trap: {
      deleteConfirmOpen: params.state.deleteConfirmOpen,
      deleteModalEl: params.refs.deleteModalEl,
      pasteConfirmOpen: params.state.pasteConfirmOpen,
      pasteModalEl: params.refs.pasteModalEl,
      failureModalOpen: params.state.failureModalOpen,
      failureModalEl: params.refs.failureModalEl,
      zipModalOpen: params.state.zipModalOpen,
      zipModalEl: params.refs.zipModalEl,
      renameOpen: params.state.renameOpen,
      renameModalEl: params.refs.renameModalEl,
      renameInputEl: params.refs.renameInputEl,
      createOpen: params.state.createOpen,
      createModalEl: params.refs.createModalEl,
      createInputEl: params.refs.createInputEl,
      jumpUrlOpen: params.state.jumpUrlOpen,
      jumpUrlModalEl: params.refs.jumpUrlModalEl,
      jumpUrlInputEl: params.refs.jumpUrlInputEl,
      propertiesOpen: params.state.propertiesOpen,
      propertiesModalEl: params.refs.propertiesModalEl,
      propertiesCloseButton: params.refs.propertiesCloseButton,
      contextMenuOpen: params.state.contextMenuOpen,
      contextMenuEl: params.refs.contextMenuEl,
    },
  });
}
