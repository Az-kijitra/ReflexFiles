/**
 * @param {object} params
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(actionId: import("$lib/ui_types").ActionId) => string} params.getMenuShortcut
 * @param {() => void} params.openKeymapHelp
 * @param {() => void} params.openUserManual
 * @param {() => void} params.openAbout
 */
export function buildHelpMenuItems(params) {
  const { t, getMenuShortcut, openKeymapHelp, openUserManual, openAbout } = params;

  return [
    {
      label: t("menu.keymap"),
      enabled: true,
      action: () => openKeymapHelp(),
      shortcut: getMenuShortcut("help_keymap"),
    },
    {
      label: t("menu.user_manual"),
      enabled: true,
      action: () => openUserManual(),
      shortcut: getMenuShortcut("help_user_manual"),
    },
    {
      label: t("menu.about"),
      enabled: true,
      action: () => openAbout(),
      shortcut: getMenuShortcut("help_about"),
    },
  ];
}
