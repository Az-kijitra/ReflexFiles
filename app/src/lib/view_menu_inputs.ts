/**
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.actions
 * @param {object} params.constants
 * @param {object} params.helpers
 */
export function buildMenuViewInputs({ state, actions, constants, helpers }) {
  return {
    MENU_GROUPS: constants.MENU_GROUPS,
    menuOpen: state.menuOpen,
    t: helpers.t,
    toggleMenu: actions.toggleMenu,
    getMenuItems: actions.getMenuItems,
    closeMenu: actions.closeMenu,
  };
}
