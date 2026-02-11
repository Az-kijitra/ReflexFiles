/**
 * @param {object} params
 */
export function buildModalFocusConfigs(params) {
  return [
    { open: params.deleteConfirmOpen, el: params.deleteModalEl },
    { open: params.pasteConfirmOpen, el: params.pasteModalEl },
    { open: params.failureModalOpen, el: params.failureModalEl },
    { open: params.zipModalOpen, el: params.zipModalEl },
    { open: params.aboutOpen, el: params.aboutModalEl },
  ];
}

/**
 * @param {object} params
 */
export function buildModalInputFocusConfigs(params) {
  return [
    { open: params.renameOpen, tick: params.tick, inputEl: params.renameInputEl, modalEl: params.renameModalEl },
    { open: params.createOpen, tick: params.tick, inputEl: params.createInputEl, modalEl: params.createModalEl },
    { open: params.jumpUrlOpen, tick: params.tick, inputEl: params.jumpUrlInputEl, modalEl: params.jumpUrlModalEl },
  ];
}

/**
 * @param {object} params
 */
export function buildModalTrapConfigs(params) {
  return [
    {
      open: params.deleteConfirmOpen,
      modalEl: params.deleteModalEl,
      onFocus: () => {
        params.deleteModalEl?.focus({ preventScroll: true });
      },
    },
    {
      open: params.pasteConfirmOpen,
      modalEl: params.pasteModalEl,
      onFocus: () => {
        params.pasteModalEl?.focus({ preventScroll: true });
      },
    },
    {
      open: params.failureModalOpen,
      modalEl: params.failureModalEl,
      onFocus: () => {
        params.failureModalEl?.focus({ preventScroll: true });
      },
    },
    {
      open: params.zipModalOpen,
      modalEl: params.zipModalEl,
      onFocus: () => {
        params.zipModalEl?.focus({ preventScroll: true });
      },
    },
    {
      open: params.renameOpen,
      modalEl: params.renameModalEl,
      onFocus: () => {
        if (params.renameInputEl) {
          params.renameInputEl.focus({ preventScroll: true });
        } else {
          params.renameModalEl?.focus();
        }
      },
    },
    {
      open: params.createOpen,
      modalEl: params.createModalEl,
      onFocus: () => {
        if (params.createInputEl) {
          params.createInputEl.focus({ preventScroll: true });
        } else {
          params.createModalEl?.focus();
        }
      },
    },
    {
      open: params.jumpUrlOpen,
      modalEl: params.jumpUrlModalEl,
      onFocus: () => {
        if (params.jumpUrlInputEl) {
          params.jumpUrlInputEl.focus({ preventScroll: true });
        } else {
          params.jumpUrlModalEl?.focus();
        }
      },
    },
    {
      open: params.propertiesOpen,
      modalEl: params.propertiesModalEl,
      onFocus: () => {
        if (params.propertiesCloseButton) {
          params.propertiesCloseButton.focus({ preventScroll: true });
        } else {
          params.propertiesModalEl?.focus();
        }
      },
    },
    {
      open: params.contextMenuOpen,
      modalEl: params.contextMenuEl,
      onFocus: () => {
        params.contextMenuEl?.focus({ preventScroll: true });
      },
    },
  ];
}
