/**
 * @param {object} ctx
 * @param {() => HTMLElement | null} ctx.getContextMenuEl
 * @param {() => { x: number, y: number }} ctx.getContextMenuPos
 * @param {(value: { x: number, y: number }) => void} ctx.setContextMenuPos
 */
import { CONTEXT_MENU_MARGIN_PX } from "$lib/ui_layout";

export function adjustContextMenuPosition(ctx) {
  const menuEl = ctx.getContextMenuEl();
  if (!menuEl) return;
  const margin = CONTEXT_MENU_MARGIN_PX;
  const rect = menuEl.getBoundingClientRect();
  const pos = ctx.getContextMenuPos();
  let nextX = pos.x;
  let nextY = pos.y;
  if (nextX + rect.width > window.innerWidth - margin) {
    nextX = pos.x - rect.width;
  }
  if (nextY + rect.height > window.innerHeight - margin) {
    nextY = pos.y - rect.height;
  }
  const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
  const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
  nextX = Math.min(Math.max(nextX, margin), maxX);
  nextY = Math.min(Math.max(nextY, margin), maxY);
  ctx.setContextMenuPos({ x: nextX, y: nextY });
}
