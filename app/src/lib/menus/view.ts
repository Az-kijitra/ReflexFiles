/**
 * @param {object} params
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(actionId: import("$lib/ui_types").ActionId) => string} params.getMenuShortcut
 * @param {() => void} params.openSortMenu
 * @param {() => void} params.toggleHidden
 * @param {() => void} params.toggleTree
 * @param {() => void} params.toggleTheme
 * @param {() => void} params.refresh
 * @param {() => boolean} params.getShowHidden
 * @param {() => boolean} params.getShowTree
 * @param {() => "light" | "dark"} params.getTheme
 */
export function buildViewMenuItems(params) {
  const {
    t,
    getMenuShortcut,
    openSortMenu,
    toggleHidden,
    toggleTree,
    toggleTheme,
    refresh,
    getShowHidden,
    getShowTree,
    getTheme,
  } = params;

  return [
    {
      label: t("menu.sort"),
      enabled: true,
      action: () => openSortMenu(),
      shortcut: getMenuShortcut("sort_menu"),
    },
    { separator: true },
    {
      label: `${t("menu.ui_show_hidden")} (${getShowHidden() ? t("state.on") : t("state.off")})`,
      enabled: true,
      action: () => toggleHidden(),
      shortcut: getMenuShortcut("toggle_hidden"),
    },
    {
      label: `${t("menu.ui_show_tree")} (${getShowTree() ? t("state.on") : t("state.off")})`,
      enabled: true,
      action: () => toggleTree(),
      shortcut: getMenuShortcut("toggle_tree"),
    },
    {
      label: `${t("menu.ui_theme")} (${getTheme() === "dark" ? t("state.dark") : t("state.light")})`,
      enabled: true,
      action: () => toggleTheme(),
      shortcut: getMenuShortcut("toggle_theme"),
    },
    { separator: true },
    {
      label: t("menu.refresh"),
      enabled: true,
      action: () => refresh(),
      shortcut: getMenuShortcut("refresh"),
    },
  ];
}
