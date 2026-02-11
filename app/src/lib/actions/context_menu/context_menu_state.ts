import { adjustContextMenuPosition } from "./context_menu_position";

/**
 * @param {object} ctx
 * @param {() => import("$lib/types").Entry[]} ctx.getEntries
 * @param {() => number} ctx.getFocusedIndex
 * @param {(value: number) => void} ctx.setFocusedIndex
 * @param {() => string[]} ctx.getSelectedPaths
 * @param {(value: string[]) => void} ctx.setSelected
 * @param {(value: number | null) => void} ctx.setAnchorIndex
 * @param {(value: { x: number, y: number }) => void} ctx.setContextMenuPos
 * @param {(value: "blank" | "item") => void} ctx.setContextMenuMode
 * @param {(value: boolean) => void} ctx.setContextMenuCanPaste
 * @param {() => { paths: string[], cut: boolean }} ctx.getLastClipboard
 * @param {(value: boolean) => void} ctx.setContextMenuOpen
 * @param {() => boolean} ctx.getContextMenuOpen
 * @param {() => HTMLElement | null} ctx.getContextMenuEl
 * @param {() => Promise<void>} ctx.tick
 * @param {() => Promise<{ paths?: string[] }>} ctx.clipboardGetFiles
 * @param {(value: number) => void} ctx.setContextMenuIndex
 */
export function createContextMenuState(ctx) {
  async function openContextMenu(event, entry = null) {
    event.preventDefault();
    event.stopPropagation();
    ctx.setContextMenuPos({ x: event.clientX, y: event.clientY });
    ctx.setContextMenuMode(entry ? "item" : "blank");

    if (entry) {
      const entries = ctx.getEntries();
      const index = entries.indexOf(entry);
      if (index >= 0) {
        ctx.setFocusedIndex(index);
        const selected = ctx.getSelectedPaths();
        if (!selected.includes(entry.path)) {
          ctx.setSelected([entry.path]);
          ctx.setAnchorIndex(index);
        }
      }
    }

    try {
      const clip = await ctx.clipboardGetFiles();
      ctx.setContextMenuCanPaste(
        !!((clip?.paths && clip.paths.length) || ctx.getLastClipboard().paths.length)
      );
    } catch {
      ctx.setContextMenuCanPaste(ctx.getLastClipboard().paths.length > 0);
    }
    ctx.setContextMenuOpen(true);
    await ctx.tick();
    ctx.setContextMenuIndex(-1);
    const menuEl = ctx.getContextMenuEl();
    if (menuEl) {
      menuEl.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        if (ctx.getContextMenuOpen()) {
          menuEl.focus({ preventScroll: true });
        }
      });
      setTimeout(() => {
        if (ctx.getContextMenuOpen()) {
          menuEl.focus({ preventScroll: true });
        }
      }, 0);
    }
    adjustContextMenuPosition(ctx);
  }

  function closeContextMenu() {
    ctx.setContextMenuOpen(false);
  }

  return { openContextMenu, closeContextMenu };
}
