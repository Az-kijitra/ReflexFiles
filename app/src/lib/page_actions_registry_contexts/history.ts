import { AnyFn, Getter, Setter } from "./shared";

export interface HistoryContext {
  tick: AnyFn;
  getJumpUrlInputEl: Getter<HTMLInputElement | null>;
  getJumpUrlModalEl: Getter<HTMLElement | null>;
  getCurrentPath: Getter<string>;
  addJumpPath: AnyFn;
  getJumpList: Getter<any[]>;
  setJumpList: Setter<any[]>;
  scheduleUiSave: AnyFn;
  t: AnyFn;
  normalizeUrl: AnyFn;
  addJumpUrlItem: AnyFn;
  setJumpUrlOpen: Setter<boolean>;
  setJumpUrlError: Setter<string>;
  setJumpUrlValue: Setter<string>;
  getJumpUrlValue: Getter<string>;
  isLikelyUrl: AnyFn;
  getSearchQuery: Getter<string>;
  setSearchActive: Setter<boolean>;
  setSearchError: Setter<string>;
  updateSearchHistory: AnyFn;
  getSearchHistory: Getter<string[]>;
  setSearchHistory: Setter<string[]>;
  setSearchQuery: Setter<string>;
  getDropdownEl: Getter<HTMLElement | null>;
  setDropdownOpen: Setter<boolean>;
  openUrl: AnyFn;
  loadDir: AnyFn;
  getPathHistory: Getter<string[]>;
  setPathHistory: Setter<string[]>;
  removeJumpValue: AnyFn;
  removeHistoryValue: AnyFn;
  [key: string]: unknown;
}
