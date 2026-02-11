/**
 * @param {object} params
 * @param {() => string} params.getMenuOpen
 * @param {(value: string) => void} params.setMenuOpen
 */
export function createMenuState(params) {
  const { getMenuOpen, setMenuOpen } = params;

  /** @param {string} name */
  function toggleMenu(name) {
    setMenuOpen(getMenuOpen() === name ? "" : name);
  }

  function closeMenu() {
    setMenuOpen("");
  }

  return { toggleMenu, closeMenu };
}
