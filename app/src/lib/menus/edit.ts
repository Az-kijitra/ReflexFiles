/**
 * @param {object} params
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(actionId: import("$lib/ui_types").ActionId) => string} params.getMenuShortcut
 * @param {() => void} params.performUndo
 * @param {() => void} params.performRedo
 * @param {() => void} params.copySelected
 * @param {() => void} params.duplicateSelected
 * @param {() => void} params.prefixDateSelected
 * @param {() => void} params.cutSelected
 * @param {() => void} params.pasteItems
 * @param {() => boolean} [params.hasOperationTargets]
 * @param {() => boolean} [params.hasSelection]
 * @param {() => boolean} [params.canPasteCurrentPath]
 * @param {() => boolean} [params.canCopyTargets]
 * @param {() => boolean} [params.canDuplicateTargets]
 * @param {() => boolean} [params.canPrefixDateTargets]
 * @param {() => boolean} [params.canCutTargets]
 * @param {() => boolean} [params.canDeleteSelection]
 * @param {() => boolean} [params.canOpenPropertiesSelection]
 * @param {() => void} params.requestDeleteSelected
 * @param {() => void} params.requestOpenPropertiesSelected
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
    copySelected,
    duplicateSelected,
    prefixDateSelected,
    cutSelected,
    pasteItems,
    hasOperationTargets,
    hasSelection,
    canPasteCurrentPath,
    canCopyTargets,
    canDuplicateTargets,
    canPrefixDateTargets,
    canCutTargets,
    canDeleteSelection,
    canOpenPropertiesSelection,
    requestDeleteSelected,
    requestOpenPropertiesSelected,
    selectAll,
    clearSelection,
    invertSelection,
    openSearch,
  } = params;

  const hasTargets = hasOperationTargets ? hasOperationTargets() : true;
  const hasSelectedItems = hasSelection ? hasSelection() : true;
  const copyEnabled = hasTargets && (canCopyTargets ? canCopyTargets() : true);
  const duplicateEnabled = hasTargets && (canDuplicateTargets ? canDuplicateTargets() : true);
  const prefixDateEnabled = hasTargets && (canPrefixDateTargets ? canPrefixDateTargets() : true);
  const cutEnabled = hasTargets && (canCutTargets ? canCutTargets() : true);
  const pasteEnabled = canPasteCurrentPath ? canPasteCurrentPath() : true;
  const deleteEnabled = hasSelectedItems && (canDeleteSelection ? canDeleteSelection() : true);
  const propertiesEnabled =
    hasSelectedItems && (canOpenPropertiesSelection ? canOpenPropertiesSelection() : true);

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
      label: t("menu.copy"),
      enabled: copyEnabled,
      action: () => copySelected(),
      shortcut: getMenuShortcut("copy"),
    },
    {
      label: t("menu.duplicate"),
      enabled: duplicateEnabled,
      action: () => duplicateSelected(),
      shortcut: getMenuShortcut("duplicate"),
    },
    {
      label: t("menu.prefix_date"),
      enabled: prefixDateEnabled,
      action: () => prefixDateSelected(),
      shortcut: getMenuShortcut("prefix_date"),
    },
    {
      label: t("menu.cut"),
      enabled: cutEnabled,
      action: () => cutSelected(),
      shortcut: getMenuShortcut("cut"),
    },
    {
      label: t("menu.paste"),
      enabled: pasteEnabled,
      reason: pasteEnabled ? "" : t("capability.not_available"),
      action: () => pasteItems(),
      shortcut: getMenuShortcut("paste"),
    },
    { separator: true },
    {
      label: t("menu.delete"),
      enabled: deleteEnabled,
      action: () => requestDeleteSelected(),
      shortcut: getMenuShortcut("delete"),
    },
    {
      label: t("menu.properties"),
      enabled: propertiesEnabled,
      action: () => requestOpenPropertiesSelected(),
      shortcut: getMenuShortcut("properties"),
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
