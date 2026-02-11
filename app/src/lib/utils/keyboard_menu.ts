/**
 * @param {KeyboardEvent} event
 * @param {object} ctx
 */
export function handleMenuKey(event, ctx) {
  const active = ctx.activeElement;
  if (event.key === "Escape" && ctx.menuOpen) {
    event.preventDefault();
    ctx.closeMenu?.();
    ctx.focusList?.();
    return true;
  }
  if (ctx.matchesAction(event, "settings")) {
    event.preventDefault();
    ctx.openConfigFile();
    return true;
  }
  if (ctx.matchesAction(event, "help_keymap")) {
    event.preventDefault();
    ctx.openKeymapHelp();
    return true;
  }
  if (active && active.tagName === "INPUT") {
    if (ctx.pathInputEl && active === ctx.pathInputEl) {
      if (ctx.matchesAction(event, "history_jump_list")) {
        event.preventDefault();
        if (!ctx.jumpList || ctx.jumpList.length === 0) {
          ctx.setStatusMessage(ctx.t("no_items"));
          return true;
        }
        ctx.setDropdownMode("jump");
        ctx.setDropdownOpen(true);
        return true;
      }
      if (ctx.matchesAction(event, "history")) {
        event.preventDefault();
        if (!ctx.pathHistory || ctx.pathHistory.length === 0) {
          ctx.setStatusMessage(ctx.t("no_items"));
          return true;
        }
        ctx.setDropdownMode("history");
        ctx.setDropdownOpen(true);
        return true;
      }
      if (ctx.matchesAction(event, "jump_add_url")) {
        event.preventDefault();
        ctx.openJumpUrlModal();
        return true;
      }
    }
    return true;
  }
  return false;
}
