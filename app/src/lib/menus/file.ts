/**
 * @param {object} params
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(actionId: import("$lib/ui_types").ActionId) => string} params.getMenuShortcut
 * @param {() => void} params.openFocusedOrSelected
 * @param {() => void} params.openParentForSelection
 * @param {() => void} params.openInExplorer
 * @param {() => void} params.openInCmd
 * @param {() => void} params.openInVSCode
 * @param {() => void} params.openInGitClient
 * @param {() => void} params.copySelected
 * @param {() => void} params.duplicateSelected
 * @param {() => void} params.prefixDateSelected
 * @param {() => void} params.cutSelected
 * @param {() => void} params.pasteItems
 * @param {() => void} params.requestDeleteSelected
 * @param {() => void} params.requestOpenPropertiesSelected
 * @param {() => void} params.invokeExit
 * @param {() => void} params.closeMenu
 */
export function buildFileMenuItems(params) {
  const {
    t,
    getMenuShortcut,
    openFocusedOrSelected,
    openParentForSelection,
    openInExplorer,
    openInCmd,
    openInVSCode,
    openInGitClient,
    copySelected,
    duplicateSelected,
    prefixDateSelected,
    cutSelected,
    pasteItems,
    requestDeleteSelected,
    requestOpenPropertiesSelected,
    invokeExit,
    closeMenu,
  } = params;

  return [
    {
      label: t("menu.open"),
      enabled: true,
      action: () => openFocusedOrSelected(),
      shortcut: getMenuShortcut("open"),
    },
    {
      label: t("menu.open_parent"),
      enabled: true,
      action: () => openParentForSelection(),
      shortcut: getMenuShortcut("go_parent"),
    },
    {
      label: t("menu.open_explorer"),
      enabled: true,
      action: () => openInExplorer(),
      shortcut: getMenuShortcut("open_explorer"),
    },
    {
      label: t("menu.open_cmd"),
      enabled: true,
      action: () => openInCmd(),
      shortcut: getMenuShortcut("open_cmd"),
    },
    {
      label: t("menu.open_vscode"),
      enabled: true,
      action: () => openInVSCode(),
      shortcut: getMenuShortcut("open_vscode"),
    },
    {
      label: t("menu.open_git_client"),
      enabled: true,
      action: () => openInGitClient(),
      shortcut: getMenuShortcut("open_git_client"),
    },
    { separator: true },
    {
      label: t("menu.copy"),
      enabled: true,
      action: () => copySelected(),
      shortcut: getMenuShortcut("copy"),
    },
    {
      label: t("menu.duplicate"),
      enabled: true,
      action: () => duplicateSelected(),
      shortcut: getMenuShortcut("duplicate"),
    },
    {
      label: t("menu.prefix_date"),
      enabled: true,
      action: () => prefixDateSelected(),
      shortcut: getMenuShortcut("prefix_date"),
    },
    {
      label: t("menu.cut"),
      enabled: true,
      action: () => cutSelected(),
      shortcut: getMenuShortcut("cut"),
    },
    {
      label: t("menu.paste"),
      enabled: true,
      action: () => pasteItems(),
      shortcut: getMenuShortcut("paste"),
    },
    { separator: true },
    {
      label: t("menu.delete"),
      enabled: true,
      action: () => requestDeleteSelected(),
      shortcut: getMenuShortcut("delete"),
    },
    {
      label: t("menu.properties"),
      enabled: true,
      action: () => requestOpenPropertiesSelected(),
      shortcut: getMenuShortcut("properties"),
    },
    { separator: true },
    {
      label: t("menu.exit"),
      enabled: true,
      action: () => {
        closeMenu();
        invokeExit();
      },
      shortcut: getMenuShortcut("exit"),
    },
  ];
}
