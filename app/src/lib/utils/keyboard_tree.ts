/**
 * @param {KeyboardEvent} event
 * @param {object} ctx
 */
export function handleTreeKeyBlock(event, ctx) {
  const active = ctx.activeElement;
  const treeActive = ctx.treeEl && (active === ctx.treeEl || ctx.treeEl.contains(active));
  if (treeActive) {
    const handled = ctx.handleTreeKey(event);
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
  }
  return false;
}
