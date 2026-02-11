/**
 * @param {object} params
 * @param {string} params.statusMessage
 * @param {(key: string, vars?: Record<string, string | number>) => string} params.t
 * @param {string} params.sortKey
 * @param {"asc" | "desc"} params.sortOrder
 * @param {number} params.selectedCount
 * @param {boolean} params.showHidden
 * @param {boolean} params.searchActive
 * @param {string} params.searchQuery
 */
export function buildStatusItems(params) {
  /** @type {string[]} */
  const items = [];
  if (params.statusMessage) {
    items.push(params.statusMessage);
  }
  const focusTarget = resolveFocusTarget();
  items.push(params.t("status.focus", { target: params.t(`focus.${focusTarget}`) }));
  items.push(
    `${params.t("menu.sort")} ${params.sortKey} ${params.sortOrder === "asc" ? "↑" : "↓"}`
  );
  items.push(params.t("status.selected", { count: params.selectedCount }));
  items.push(
    params.t("status.hidden", { state: params.showHidden ? params.t("state.on") : params.t("state.off") })
  );
  if (params.searchActive && params.searchQuery.trim()) {
    items.push(params.t("status.filter", { query: params.searchQuery.trim() }));
  }
  items.push(params.t("status.keymap_hint"));
  return items;
}

function resolveFocusTarget() {
  if (typeof document === "undefined") return "none";
  if (document.querySelector(".modal-backdrop")) return "modal";
  if (document.querySelector(".context-menu")) return "context";
  if (document.querySelector(".dropdown")) return "dropdown";
  if (document.querySelector(".menu-dropdown")) return "menu";
  const active = document.activeElement;
  if (active && typeof active.closest === "function") {
    if (active.closest(".menu-bar")) return "menu";
    if (active.closest(".list")) return "list";
    if (active.closest(".tree-panel")) return "tree";
  }
  if (active && active.tagName === "INPUT") return "path";
  if (active === document.body || active === document.documentElement) return "list";
  return "none";
}
