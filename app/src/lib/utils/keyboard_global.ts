import { handleListKey } from "./keyboard_list";
import { handleMenuKey } from "./keyboard_menu";
import { handleOverlayKey } from "./keyboard_overlay";
import { handleTreeKeyBlock } from "./keyboard_tree";

/**
 * @param {KeyboardEvent} event
 * @param {object} ctx
 */
export function handleGlobalKey(event, ctx) {
  const isCtrlQ =
    event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.metaKey &&
    (event.code === "KeyQ" || event.key?.toLowerCase() === "q");
  if (isCtrlQ) {
    event.preventDefault();
    ctx.exitApp();
    return true;
  }
  const isCtrlComma =
    event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey &&
    !event.metaKey &&
    (event.code === "Comma" || event.key === "," || event.key === "、");
  if (isCtrlComma) {
    event.preventDefault();
    ctx.openConfigFile();
    return true;
  }
  if (ctx.matchesAction(event, "exit")) {
    event.preventDefault();
    ctx.exitApp();
    return true;
  }
  if (handleOverlayKey(event, ctx)) {
    return true;
  }
  if (handleMenuKey(event, ctx)) {
    return true;
  }
  if (handleTreeKeyBlock(event, ctx)) {
    return true;
  }
  if (handleListKey(event, ctx)) {
    return true;
  }
  return false;
}
