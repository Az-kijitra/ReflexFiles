/**
 * Git panel logic: status refresh helpers and keyboard/panel toggle handlers.
 * Extracted from +page.svelte to keep git-related concerns in one place.
 */

import { gitGetStatus } from "$lib/utils/tauri_git";
import { MODAL_OVERLAY_SELECTOR } from "$lib/page_constants";

// ── Deps interface ─────────────────────────────────────────────────────────────

export interface GitPanelDeps {
  getLeftCurrentPath(): string;
  getRightCurrentPath(): string;
  setLeftGitStatus(v: ReturnType<typeof gitGetStatus> extends Promise<infer T> ? T | null : null): void;
  setRightGitStatus(v: ReturnType<typeof gitGetStatus> extends Promise<infer T> ? T | null : null): void;
  getGitPanelOpen(): boolean;
  setGitPanelOpen(v: boolean): void;
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createGitPanelHandlers(deps: GitPanelDeps) {
  const {
    getLeftCurrentPath,
    getRightCurrentPath,
    setLeftGitStatus,
    setRightGitStatus,
    getGitPanelOpen,
    setGitPanelOpen,
  } = deps;

  async function refreshLeftGitStatus(path?: string) {
    try {
      setLeftGitStatus(await gitGetStatus(path || getLeftCurrentPath()));
    } catch {
      setLeftGitStatus(null);
    }
  }

  async function refreshRightGitStatus(path?: string) {
    try {
      setRightGitStatus(await gitGetStatus(path || getRightCurrentPath()));
    } catch {
      setRightGitStatus(null);
    }
  }

  function openGitPanel() {
    setGitPanelOpen(true);
  }

  function closeGitPanel() {
    setGitPanelOpen(false);
  }

  /** keydown handler for Ctrl+G — returns the function so callers can add/remove it. */
  function makeGitPanelToggleHandler() {
    return function handleGitPanelToggle(event: KeyboardEvent) {
      if (!event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      if (event.key !== "g" && event.key !== "G") return;
      const activeEl = document.activeElement;
      if (activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA") return;
      const isInModal =
        typeof (activeEl as Element | null)?.closest === "function" &&
        (activeEl as Element).closest(MODAL_OVERLAY_SELECTOR);
      if (isInModal) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (getGitPanelOpen()) { closeGitPanel(); } else { openGitPanel(); }
    };
  }

  return {
    refreshLeftGitStatus,
    refreshRightGitStatus,
    openGitPanel,
    closeGitPanel,
    makeGitPanelToggleHandler,
  };
}
