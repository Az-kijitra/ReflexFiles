/** @param {string} part */
export function normalizeKeyPart(part) {
  const lower = part.toLowerCase();
  if (lower === "ctrl" || lower === "control") return "Ctrl";
  if (lower === "alt" || lower === "option") return "Alt";
  if (lower === "shift") return "Shift";
  if (lower === "meta" || lower === "cmd" || lower === "win" || lower === "command")
    return "Meta";
  if (lower === "esc") return "Escape";
  if (lower === "del") return "Delete";
  if (lower === "pgup") return "PageUp";
  if (lower === "pgdn") return "PageDown";
  if (lower === "up") return "ArrowUp";
  if (lower === "down") return "ArrowDown";
  if (lower === "left") return "ArrowLeft";
  if (lower === "right") return "ArrowRight";
  if (part === "," || part === "、" || part === "，" || lower === "comma") return ",";
  if (part === "." || part === "。" || part === "．" || lower === "period") return ".";
  if (part === " " || lower === "space" || lower === "spacebar") return "Space";
  if (part.length === 1) return part.toUpperCase();
  return part;
}

/** @param {string} value */
export function normalizeKeyString(value) {
  if (!value) return "";
  const parts = value
    .split("+")
    .map((part) => normalizeKeyPart(part.trim()))
    .filter(Boolean);
  const mods = [];
  const keys = [];
  for (const part of parts) {
    if (part === "Ctrl" || part === "Alt" || part === "Shift" || part === "Meta") {
      mods.push(part);
    } else {
      keys.push(part);
    }
  }
  return [...mods, ...keys].join("+");
}

/** @param {KeyboardEvent} event */
export function eventToKeyString(event) {
  const ctrlPressed = event.ctrlKey || event.getModifierState?.("Control");
  const altPressed = event.altKey || event.getModifierState?.("Alt");
  const shiftPressed = event.shiftKey || event.getModifierState?.("Shift");
  const metaPressed = event.metaKey || event.getModifierState?.("Meta");
  const mods = [];
  if (ctrlPressed) mods.push("Ctrl");
  if (altPressed) mods.push("Alt");
  if (shiftPressed) mods.push("Shift");
  if (metaPressed) mods.push("Meta");

  const hasShortcutModifier = ctrlPressed || altPressed || metaPressed;
  let key = event.key === " " ? "Space" : event.key;
  if (event.code === "Space") key = "Space";
  if (event.code === "Comma") key = ",";
  if (event.code === "Period") key = ".";
  if (hasShortcutModifier) {
    if (/^Key[A-Z]$/.test(event.code)) {
      key = event.code.slice(3);
    } else if (/^Digit[0-9]$/.test(event.code)) {
      key = event.code.slice(5);
    }
  }
  const normalizedKey = normalizeKeyPart(key);
  return [...mods, normalizedKey].join("+");
}

/** @param {string} value */
export function splitBindings(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
