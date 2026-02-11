import {
  focusDropdownOnOpen,
  scrollDropdownOnOpen,
  setupListLayoutObserver,
  updateListColumnsOnBodyChange,
} from "./page_effects";

/**
 * @param {Parameters<typeof setupListLayoutObserver>[0] extends never ? any : {
 *   listBodyEl: HTMLElement | null;
 *   listEl: HTMLElement | null;
 *   updateListRows: () => void;
 *   updateOverflowMarkers: () => void;
 *   updateVisibleColumns: () => void;
 *   getActualColumnSpan: (el: HTMLElement | null) => number;
 * }} params
 */
export function applyListLayoutEffects(params) {
  updateListColumnsOnBodyChange(
    params.listBodyEl,
    params.updateOverflowMarkers,
    params.updateVisibleColumns
  );
  setupListLayoutObserver(
    params.listBodyEl,
    params.listEl,
    params.updateListRows,
    params.updateOverflowMarkers,
    params.updateVisibleColumns,
    params.getActualColumnSpan
  );
}

/**
 * @param {{
 *   dropdownOpen: boolean;
 *   tick: typeof import("svelte").tick;
 *   dropdownEl: HTMLElement | null;
 *   dropdownIndex: number;
 *   scrollDropdownToIndex: (index: number) => void;
 * }} params
 */
export function applyDropdownEffects(params) {
  focusDropdownOnOpen(params.dropdownOpen, params.tick, params.dropdownEl);
  scrollDropdownOnOpen(
    params.dropdownOpen,
    params.tick,
    params.dropdownEl,
    params.dropdownIndex,
    params.scrollDropdownToIndex
  );
}
