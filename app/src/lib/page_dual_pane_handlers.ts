/**
 * Dual-pane keyboard and pointer event handlers.
 * Extracted from +page.svelte to keep dual-pane interaction logic in one place.
 *
 * Three handler groups:
 *   1. createDualPaneFocusHandlers  — Tab / pointerdown (onMount)
 *   2. createDualPaneToggleHandler  — F3 toggle ($effect)
 *   3. createWinMergeCrossPaneHandler — Ctrl+W ($effect)
 */

import { MODAL_OVERLAY_SELECTOR } from "$lib/page_constants";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PaneRefs {
  listEl: HTMLElement | null;
  pathInputEl: HTMLElement | null;
}

// ── 1. Tab focus cycling + pointer-based pane activation ──────────────────────

export interface DualPaneFocusDeps {
  getLayoutMode(): string;
  getActivePaneId(): string;
  setActivePaneId(v: string): void;
  getLeftRefs(): PaneRefs;
  getRightRefs(): PaneRefs;
}

export function createDualPaneFocusHandlers(deps: DualPaneFocusDeps) {
  const { getLayoutMode, getActivePaneId, setActivePaneId, getLeftRefs, getRightRefs } = deps;

  function handleDualModeTab(event: KeyboardEvent) {
    if (getLayoutMode() !== "dual") return;

    const left = getLeftRefs();
    const right = getRightRefs();
    const activeEl = document.activeElement;

    // Sync activePaneId with actual DOM focus for ALL key events so that
    // Enter, Backspace, etc. always operate on the visually active pane.
    if (activeEl) {
      const inRight =
        (right.listEl && (activeEl === right.listEl || right.listEl.contains(activeEl))) ||
        (right.pathInputEl && activeEl === right.pathInputEl);
      const inLeft =
        (left.listEl && (activeEl === left.listEl || left.listEl.contains(activeEl))) ||
        (left.pathInputEl && activeEl === left.pathInputEl);
      if (inRight) setActivePaneId("right");
      else if (inLeft) setActivePaneId("left");
    }

    if (event.key !== "Tab" || event.altKey || event.metaKey) return;
    const isInModal =
      typeof (activeEl as Element | null)?.closest === "function" &&
      (activeEl as Element).closest(MODAL_OVERLAY_SELECTOR);
    if (isInModal) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    // Ctrl+Tab: switch active pane
    if (event.ctrlKey) {
      const newPaneId = getActivePaneId() === "left" ? "right" : "left";
      setActivePaneId(newPaneId);
      if (newPaneId === "right") {
        right.listEl?.focus({ preventScroll: true });
      } else {
        left.listEl?.focus({ preventScroll: true });
      }
      return;
    }

    // Tab / Shift+Tab: cycle list ↔ path-bar within the active pane
    const inLeft =
      (left.listEl && (activeEl === left.listEl || left.listEl.contains?.(activeEl as Node))) ||
      (left.pathInputEl && (activeEl === left.pathInputEl || left.pathInputEl.contains?.(activeEl as Node)));
    const inRight =
      (right.listEl && (activeEl === right.listEl || right.listEl.contains?.(activeEl as Node))) ||
      (right.pathInputEl && (activeEl === right.pathInputEl || right.pathInputEl.contains?.(activeEl as Node)));

    if (inLeft) setActivePaneId("left");
    else if (inRight) setActivePaneId("right");

    const paneId = inRight ? "right" : "left";
    const listEl  = paneId === "right" ? right.listEl  : left.listEl;
    const pathEl  = paneId === "right" ? right.pathInputEl : left.pathInputEl;

    const isListFocused = listEl && (activeEl === listEl || listEl.contains?.(activeEl as Node));
    const isPathFocused = pathEl && (activeEl === pathEl || pathEl.contains?.(activeEl as Node));

    if (!event.shiftKey) {
      if (isListFocused) {
        pathEl?.focus({ preventScroll: true });
        (pathEl as HTMLInputElement | null)?.select?.();
      } else {
        listEl?.focus({ preventScroll: true });
      }
    } else {
      if (isPathFocused) {
        listEl?.focus({ preventScroll: true });
      } else {
        pathEl?.focus({ preventScroll: true });
        (pathEl as HTMLInputElement | null)?.select?.();
      }
    }
  }

  function handleDualModePointerDown(event: PointerEvent) {
    if (getLayoutMode() !== "dual") return;
    const left = getLeftRefs();
    const right = getRightRefs();
    const target = event.target as Node | null;
    if (!target) return;
    if (
      (right.listEl && right.listEl.contains(target)) ||
      (right.pathInputEl && right.pathInputEl.contains(target))
    ) {
      setActivePaneId("right");
    } else if (
      (left.listEl && left.listEl.contains(target)) ||
      (left.pathInputEl && left.pathInputEl.contains(target))
    ) {
      setActivePaneId("left");
    }
  }

  return { handleDualModeTab, handleDualModePointerDown };
}

// ── 2. F3 dual/single pane toggle ─────────────────────────────────────────────

export interface DualPaneToggleDeps {
  getLayoutMode(): string;
  setLayoutMode(v: string): void;
  setActivePaneId(v: string): void;
  getRightCurrentPath(): string;
  getLeftCurrentPath(): string;
  loadRightDir(path: string): void;
}

export function createDualPaneToggleHandler(deps: DualPaneToggleDeps) {
  const {
    getLayoutMode,
    setLayoutMode,
    setActivePaneId,
    getRightCurrentPath,
    getLeftCurrentPath,
    loadRightDir,
  } = deps;

  return function handleDualPaneToggle(event: KeyboardEvent) {
    const isF3 =
      !event.ctrlKey && !event.altKey && !event.metaKey &&
      (event.key === "F3" || event.code === "F3" || event.keyCode === 114);
    if (!isF3) return;
    const activeEl = document.activeElement;
    if (!activeEl) return;
    const isInInput = activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA";
    const isInModal =
      typeof (activeEl as Element).closest === "function" &&
      (activeEl as Element).closest(MODAL_OVERLAY_SELECTOR);
    if (isInInput || isInModal) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = getLayoutMode() === "dual" ? "single" : "dual";
    setLayoutMode(next);
    if (next === "dual") {
      setActivePaneId("left");
      if (!getRightCurrentPath() && getLeftCurrentPath()) {
        loadRightDir(getLeftCurrentPath());
      }
    }
  };
}

// ── 3. Ctrl+W cross-pane WinMerge comparison ──────────────────────────────────

export interface WinMergeCrossPaneDeps {
  getLayoutMode(): string;
  getLeftSelectedPaths(): string[];
  getRightSelectedPaths(): string[];
  compareFiles(left: string, right: string): Promise<void>;
  showError(err: unknown): void;
}

export function createWinMergeCrossPaneHandler(deps: WinMergeCrossPaneDeps) {
  const { getLayoutMode, getLeftSelectedPaths, getRightSelectedPaths, compareFiles, showError } = deps;

  return function handleWinMergeCrossPane(event: KeyboardEvent) {
    const isCtrlW =
      event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey &&
      (event.key === "w" || event.key === "W");
    if (!isCtrlW) return;
    if (getLayoutMode() !== "dual") return;
    const activeEl = document.activeElement;
    if (!activeEl) return;
    const isInInput = activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA";
    const isInModal =
      typeof (activeEl as Element).closest === "function" &&
      (activeEl as Element).closest(MODAL_OVERLAY_SELECTOR);
    if (isInInput || isInModal) return;
    const leftSelected  = getLeftSelectedPaths();
    const rightSelected = getRightSelectedPaths();
    if (leftSelected.length === 1 && rightSelected.length === 1) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void compareFiles(leftSelected[0], rightSelected[0]).catch(showError);
    }
  };
}
