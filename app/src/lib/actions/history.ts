import { STATUS_DEFAULT_MS } from "$lib/ui_durations";

/**
 * @param {object} ctx
 * @param {object} helpers
 * @param {(message: string, durationMs?: number) => void} helpers.setStatusMessage
 */
export function createHistoryActions(ctx, helpers) {
  const { setStatusMessage } = helpers;

  async function readClipboardText() {
    if (navigator?.clipboard?.readText) {
      return await navigator.clipboard.readText();
    }
    return null;
  }

  async function openJumpUrlModalFocus() {
    await ctx.tick();
    const inputEl = ctx.getJumpUrlInputEl();
    if (inputEl) {
      inputEl.focus({ preventScroll: true });
      inputEl.select();
    } else {
      ctx.getJumpUrlModalEl()?.focus();
    }
  }

  function addJumpCurrent() {
    const currentPath = ctx.getCurrentPath();
    if (!currentPath) return;
    const next = ctx.addJumpPath(currentPath, ctx.getJumpList(), 20);
    ctx.setJumpList(next);
    ctx.scheduleUiSave();
    setStatusMessage(ctx.t("status.jump_added"), STATUS_DEFAULT_MS);
  }

  function addJumpUrl(value) {
    const url = ctx.normalizeUrl(value);
    const next = ctx.addJumpUrlItem(url, ctx.getJumpList(), 20);
    ctx.setJumpList(next);
    ctx.scheduleUiSave();
    setStatusMessage(ctx.t("status.jump_added"), STATUS_DEFAULT_MS);
  }

  async function openJumpUrlModal() {
    ctx.setJumpUrlOpen(true);
    ctx.setJumpUrlError("");
    ctx.setJumpUrlValue("");
    try {
      const text = await readClipboardText();
      if (text && ctx.isLikelyUrl(text)) {
        ctx.setJumpUrlValue(ctx.normalizeUrl(text));
      }
    } catch {
      // ignore clipboard errors
    }
    await openJumpUrlModalFocus();
  }

  function confirmJumpUrl() {
    const value = ctx.getJumpUrlValue().trim();
    if (!value || !ctx.isLikelyUrl(value)) {
      ctx.setJumpUrlError(ctx.t("error.url_invalid"));
      return;
    }
    addJumpUrl(value);
    ctx.setJumpUrlOpen(false);
    ctx.setJumpUrlValue("");
    ctx.setJumpUrlError("");
  }

  function cancelJumpUrl() {
    ctx.setJumpUrlOpen(false);
    ctx.setJumpUrlValue("");
    ctx.setJumpUrlError("");
  }

  function applySearch() {
    const query = ctx.getSearchQuery().trim();
    if (!query) {
      ctx.setSearchActive(false);
      ctx.setSearchError("");
      return;
    }
    const nextHistory = ctx.updateSearchHistory(query, ctx.getSearchHistory(), 20);
    ctx.setSearchHistory(nextHistory);
    ctx.scheduleUiSave();
  }

  function clearSearch() {
    ctx.setSearchQuery("");
    ctx.setSearchActive(false);
    ctx.setSearchError("");
  }

  /** @param {KeyboardEvent} event */
  function onSearchKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      clearSearch();
      return;
    }
    const history = ctx.getSearchHistory();
    if (event.key === "ArrowUp" && history.length) {
      event.preventDefault();
      ctx.setSearchQuery(history[0]);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      ctx.setSearchQuery("");
    }
  }

  /** @param {number} index */
  function scrollDropdownToIndex(index) {
    const dropdownEl = ctx.getDropdownEl();
    if (!dropdownEl) return;
    const items = dropdownEl.querySelectorAll(".dropdown-item");
    const target = items[index];
    if (!target) return;
    const containerRect = dropdownEl.getBoundingClientRect();
    const itemRect = target.getBoundingClientRect();
    const overTop = itemRect.top < containerRect.top;
    const overBottom = itemRect.bottom > containerRect.bottom;
    if (overTop) {
      dropdownEl.scrollTop -= containerRect.top - itemRect.top;
    } else if (overBottom) {
      dropdownEl.scrollTop += itemRect.bottom - containerRect.bottom;
    }
  }

  /** @param {string} value */
  function removeJump(value) {
    ctx.setJumpList(ctx.removeJumpValue(ctx.getJumpList(), value));
    ctx.scheduleUiSave();
  }

  /** @param {string} value */
  function removeHistory(value) {
    ctx.setPathHistory(ctx.removeHistoryValue(ctx.getPathHistory(), value));
    ctx.scheduleUiSave();
  }

  /** @param {import("$lib/types").JumpItem} item */
  function selectDropdown(item) {
    ctx.setDropdownOpen(false);
    if (item.type === "url") {
      ctx.openUrl(item.value);
      return;
    }
    ctx.loadDir(item.value);
  }

  return {
    addJumpCurrent,
    addJumpUrl,
    openJumpUrlModal,
    confirmJumpUrl,
    cancelJumpUrl,
    applySearch,
    clearSearch,
    onSearchKeydown,
    scrollDropdownToIndex,
    removeJump,
    removeHistory,
    selectDropdown,
  };
}
