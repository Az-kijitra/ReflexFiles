/**
 * @param {string} path
 */
export function getParentPath(path) {
  if (!path) return "";
  const trimmed = path.replace(/[\\\/]+$/, "");
  const parent = trimmed.replace(/[\\\/][^\\\/]+$/, "");
  return parent && parent !== trimmed ? parent : "";
}
