/**
 * @param {object} params
 * @param {() => HTMLElement | null} params.getListEl
 * @param {() => HTMLElement | null} params.getTreeEl
 * @param {() => HTMLElement | null} params.getTreeBodyEl
 * @param {() => number} params.getTreeFocusedIndex
 * @param {() => unknown} params.getTreeRoot
 * @param {(value: number) => void} params.setTreeFocusedIndex
 * @param {(el: HTMLElement | null, index: number) => void} params.scrollTreeToFocus
 */
export function createFocusHelpers(params) {
  const {
    getListEl,
    getTreeEl,
    getTreeBodyEl,
    getTreeFocusedIndex,
    getTreeRoot,
    setTreeFocusedIndex,
    scrollTreeToFocus,
  } = params;

  function focusList() {
    getListEl()?.focus({ preventScroll: true });
  }

  function focusTree() {
    getTreeEl()?.focus({ preventScroll: true });
  }

  function focusTreeTop() {
    if (!getTreeEl() || !getTreeRoot()) return;
    setTreeFocusedIndex(0);
    scrollTreeToFocus(getTreeBodyEl(), getTreeFocusedIndex());
    focusTree();
  }

  return {
    focusList,
    focusTree,
    focusTreeTop,
  };
}
