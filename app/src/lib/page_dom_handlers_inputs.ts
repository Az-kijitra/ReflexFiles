/**
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.actions
 * @param {object} params.helpers
 * @param {object} params.constants
 */
export function buildDomHandlersInputs({ state, actions, helpers, constants }) {
  return {
    keydown: buildKeydownInputs({ state, actions, helpers, constants }),
    click: buildClickInputs({ state, actions }),
  };
}

/**
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.actions
 * @param {object} params.helpers
 * @param {object} params.constants
 */
export function buildKeydownInputs({ state, actions, helpers, constants }) {
  return {
    state,
    actions,
    helpers,
    constants,
  };
}

/**
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.actions
 */
export function buildClickInputs({ state, actions }) {
  return {
    state: {
      getContextMenuOpen: state.getContextMenuOpen,
      getContextMenuEl: state.getContextMenuEl,
      getMenuOpen: state.getMenuOpen,
      getMenuBarEl: state.getMenuBarEl,
    },
    actions: {
      closeContextMenu: actions.closeContextMenu,
      closeMenu: actions.closeMenu,
    },
  };
}
