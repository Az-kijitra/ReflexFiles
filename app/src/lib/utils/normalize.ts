/** @param {string} value */
export function normalizePathValue(value) {
  if (!value) return "";
  return value.replace(/\//g, "\\").replace(/[\\\/]+$/, "").toLowerCase();
}

/** @param {string} value */
export function normalizeUrl(value) {
  return value.trim();
}

/** @param {import("$lib/types").ExternalAppConfig[]} list */
export function normalizeExternalApps(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((app) => ({
      name: String(app?.name || "").trim(),
      command: String(app?.command || "").trim(),
      args: Array.isArray(app?.args) ? app.args.map((a) => String(a)) : [],
      shortcut: String(app?.shortcut || "").trim(),
    }))
    .filter((app) => app.name && app.command);
}
