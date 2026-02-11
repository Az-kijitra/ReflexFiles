/**
 * @param {KeyboardEvent} event
 * @param {object} ctx
 */
export function handleOverlayKey(event, ctx) {
  const active = ctx.activeElement;
  if (ctx.pasteConfirmOpen || ctx.deleteConfirmOpen || ctx.jumpUrlOpen) {
    return true;
  }
  if (ctx.sortMenuOpen) {
    event.preventDefault();
    event.stopPropagation();
    ctx.handleSortMenuKey(event);
    return true;
  }
  if (ctx.pasteConfirmOpen || ctx.zipModalOpen || ctx.failureModalOpen) {
    return true;
  }
  if (ctx.dropdownOpen && ctx.dropdownEl && (active === ctx.dropdownEl || ctx.dropdownEl.contains(active))) {
    return true;
  }
  if (ctx.deleteConfirmOpen) {
    return true;
  }
  if (event.key === "Tab") {
    if (!event.shiftKey) {
      const isPathActive =
        ctx.pathInputEl &&
        (active === ctx.pathInputEl ||
          (ctx.pathInputEl.contains && ctx.pathInputEl.contains(active)));
      if (isPathActive) {
        return true;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    const isListActive =
      ctx.listEl && (active === ctx.listEl || (ctx.listEl.contains && ctx.listEl.contains(active)));
    const isPathActive =
      ctx.pathInputEl &&
      (active === ctx.pathInputEl ||
        (ctx.pathInputEl.contains && ctx.pathInputEl.contains(active)));
    const isTreeActive =
      ctx.treeEl && (active === ctx.treeEl || (ctx.treeEl.contains && ctx.treeEl.contains(active)));
    if (isListActive) {
      ctx.pathInputEl?.focus({ preventScroll: true });
      ctx.pathInputEl?.select?.();
      return true;
    }
    if (isPathActive) {
      if (ctx.showTree && ctx.treeEl) {
        ctx.focusTreeTop();
      } else {
        ctx.focusList();
      }
      return true;
    }
    if (isTreeActive) {
      ctx.focusList();
      return true;
    }
    if (ctx.showTree && ctx.treeEl) {
      ctx.focusTreeTop();
      return true;
    }
    ctx.focusList();
    return true;
  }
  if (ctx.renameOpen) {
    if (event.key === "Escape") {
      event.preventDefault();
      ctx.cancelRename();
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      ctx.confirmRename();
      return true;
    }
    return true;
  }
  if (ctx.createOpen) {
    if (event.key === "Escape") {
      event.preventDefault();
      ctx.cancelCreate();
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      ctx.confirmCreate();
      return true;
    }
    return true;
  }
  if (ctx.jumpUrlOpen) {
    if (event.key === "Escape") {
      event.preventDefault();
      ctx.cancelJumpUrl();
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      ctx.confirmJumpUrl();
      return true;
    }
    return true;
  }
  if (ctx.propertiesOpen) {
    if (event.key === "Escape") {
      event.preventDefault();
      ctx.closeProperties();
    }
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
  if (ctx.contextMenuOpen) {
    event.preventDefault();
    event.stopPropagation();
    ctx.handleContextMenuKey(event);
    if (event.key === "Escape") {
      ctx.focusList?.();
      return true;
    }
    if (ctx.contextMenuEl) {
      ctx.contextMenuEl.focus({ preventScroll: true });
    }
    return true;
  }
  return false;
}
