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
 * @param {() => string} [params.getCurrentPath]
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
    getCurrentPath,
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
  const pasteReason =
    pasteEnabled
      ? ""
      : String(getCurrentPath ? getCurrentPath() : "")
          .trim()
          .toLowerCase()
          .startsWith("gdrive://")
        ? t("paste.destination_not_writable")
        : t("capability.not_available");
  const deleteEnabled = hasSelectedItems && (canDeleteSelection ? canDeleteSelection() : true);
  const propertiesEnabled =
    hasSelectedItems && (canOpenPropertiesSelection ? canOpenPropertiesSelection() : true);

  return [
    {
      id: "menu-edit-undo",
      label: t("menu.undo"),
      enabled: true,
      action: () => performUndo(),
      shortcut: getMenuShortcut("undo"),
    },
    {
      id: "menu-edit-redo",
      label: t("menu.redo"),
      enabled: true,
      action: () => performRedo(),
      shortcut: getMenuShortcut("redo"),
    },
    { separator: true },
    {
      id: "menu-edit-copy",
      label: t("menu.copy"),
      enabled: copyEnabled,
      action: () => copySelected(),
      shortcut: getMenuShortcut("copy"),
    },
    {
      id: "menu-edit-duplicate",
      label: t("menu.duplicate"),
      enabled: duplicateEnabled,
      action: () => duplicateSelected(),
      shortcut: getMenuShortcut("duplicate"),
    },
    {
      id: "menu-edit-prefix-date",
      label: t("menu.prefix_date"),
      enabled: prefixDateEnabled,
      action: () => prefixDateSelected(),
      shortcut: getMenuShortcut("prefix_date"),
    },
    {
      id: "menu-edit-cut",
      label: t("menu.cut"),
      enabled: cutEnabled,
      action: () => cutSelected(),
      shortcut: getMenuShortcut("cut"),
    },
    {
      id: "menu-edit-paste",
      label: t("menu.paste"),
      enabled: pasteEnabled,
      reason: pasteReason,
      action: () => pasteItems(),
      shortcut: getMenuShortcut("paste"),
    },
    { separator: true },
    {
      id: "menu-edit-delete",
      label: t("menu.delete"),
      enabled: deleteEnabled,
      action: () => requestDeleteSelected(),
      shortcut: getMenuShortcut("delete"),
    },
    {
      id: "menu-edit-properties",
      label: t("menu.properties"),
      enabled: propertiesEnabled,
      action: () => requestOpenPropertiesSelected(),
      shortcut: getMenuShortcut("properties"),
    },
    { separator: true },
    {
      id: "menu-edit-select-all",
      label: t("menu.select_all"),
      enabled: true,
      action: () => selectAll(),
      shortcut: getMenuShortcut("select_all"),
    },
    {
      id: "menu-edit-clear-selection",
      label: t("menu.clear_selection"),
      enabled: true,
      action: () => clearSelection(),
      shortcut: getMenuShortcut("clear_selection"),
    },
    {
      id: "menu-edit-invert-selection",
      label: t("menu.invert_selection"),
      enabled: true,
      action: () => invertSelection(),
      shortcut: getMenuShortcut("invert_selection"),
    },
    { separator: true },
    {
      id: "menu-edit-find",
      label: t("menu.find"),
      enabled: true,
      action: () => openSearch(),
      shortcut: getMenuShortcut("search"),
    },
  ];
}
