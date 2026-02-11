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
  const mods = [];
  if (event.ctrlKey) mods.push("Ctrl");
  if (event.altKey) mods.push("Alt");
  if (event.shiftKey) mods.push("Shift");
  if (event.metaKey) mods.push("Meta");
  let key = event.key === " " ? "Space" : event.key;
  if (event.code === "Space") key = "Space";
  if (event.code === "Comma") key = ",";
  if (event.code === "Period") key = ".";
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
