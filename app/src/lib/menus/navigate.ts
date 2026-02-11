/**
 * @param {object} params
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {(actionId: import("$lib/ui_types").ActionId) => string} params.getMenuShortcut
 * @param {() => void} params.addJumpCurrent
 * @param {() => void} params.openJumpUrlModal
 * @param {() => void} params.openJumpList
 * @param {() => void} params.openHistoryList
 * @param {() => boolean} params.hasJumpList
 * @param {() => boolean} params.hasPathHistory
 * @param {(message: string) => void} params.setStatusMessage
 */
export function buildNavigateMenuItems(params) {
  const {
    t,
    getMenuShortcut,
    addJumpCurrent,
    openJumpUrlModal,
    openJumpList,
    openHistoryList,
    hasJumpList,
    hasPathHistory,
    setStatusMessage,
  } = params;

  return [
    {
      label: t("menu.jump_add"),
      enabled: true,
      action: () => addJumpCurrent(),
      shortcut: getMenuShortcut("jump_add"),
    },
    {
      label: t("menu.jump_add_url"),
      enabled: true,
      action: () => openJumpUrlModal(),
      shortcut: getMenuShortcut("jump_add_url"),
    },
    {
      label: t("menu.history_jump_list"),
      enabled: true,
      action: () => {
        if (!hasJumpList()) {
          setStatusMessage(t("no_items"));
          return;
        }
        openJumpList();
      },
      shortcut: getMenuShortcut("history_jump_list"),
    },
    {
      label: t("menu.history"),
      enabled: true,
      action: () => {
        if (!hasPathHistory()) {
          setStatusMessage(t("no_items"));
          return;
        }
        openHistoryList();
      },
      shortcut: getMenuShortcut("history"),
    },
  ];
}
