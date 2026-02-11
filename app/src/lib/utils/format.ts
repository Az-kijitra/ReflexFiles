/**
 * @param {number} bytes
 */
export function formatSize(bytes) {
  if (!bytes || bytes === 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const fixed = value >= 10 || idx === 0 ? 0 : 1;
  return `${value.toFixed(fixed)} ${units[idx]}`;
}

/**
 * @param {string} value
 */
export function formatModified(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (num) => String(num).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * @param {string} name
 * @param {string} ext
 * @param {number} maxChars
 */
export function formatName(name, ext, maxChars = 24) {
  if (!name) return "";
  const safeMax = Math.max(8, Number(maxChars) || 24);
  if (name.length <= safeMax) return name;
  const safeExt = ext || "";
  const hasExt = safeExt && name.toLowerCase().endsWith(safeExt.toLowerCase());
  const extLen = hasExt ? safeExt.length : 0;
  const baseLen = name.length - extLen;
  const maxBase = Math.max(1, safeMax - extLen - 1);
  if (hasExt) {
    const base = name.slice(0, baseLen);
    return `${base.slice(0, maxBase)}…${safeExt}`;
  }
  return `${name.slice(0, safeMax - 1)}…`;
}
