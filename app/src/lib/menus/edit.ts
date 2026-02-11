/**
 * @param {object} params
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(actionId: import("$lib/ui_types").ActionId) => string} params.getMenuShortcut
 * @param {() => void} params.performUndo
 * @param {() => void} params.performRedo
 * @param {() => void} params.selectAll
 * @param {() => void} params.clearSelection
 * @param {() => void} params.invertSelection
 * @param {() => Promise<void>} params.openSearch
 */
export function buildEditMenuItems(params) {
  const {
    t,
    getMenuShortcut,
    performUndo,
    performRedo,
    selectAll,
    clearSelection,
    invertSelection,
    openSearch,
  } = params;

  return [
    {
      label: t("menu.undo"),
      enabled: true,
      action: () => performUndo(),
      shortcut: getMenuShortcut("undo"),
    },
    {
      label: t("menu.redo"),
      enabled: true,
      action: () => performRedo(),
      shortcut: getMenuShortcut("redo"),
    },
    { separator: true },
    {
      label: t("menu.select_all"),
      enabled: true,
      action: () => selectAll(),
      shortcut: getMenuShortcut("select_all"),
    },
    {
      label: t("menu.clear_selection"),
      enabled: true,
      action: () => clearSelection(),
      shortcut: getMenuShortcut("clear_selection"),
    },
    {
      label: t("menu.invert_selection"),
      enabled: true,
      action: () => invertSelection(),
      shortcut: getMenuShortcut("invert_selection"),
    },
    { separator: true },
    {
      label: t("menu.find"),
      enabled: true,
      action: () => openSearch(),
      shortcut: getMenuShortcut("search"),
    },
  ];
}
