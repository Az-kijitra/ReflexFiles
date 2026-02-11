import { AnyFn, Getter, Setter } from "./shared";

export interface ClipboardContext {
  getPastePendingPaths: Getter<string[]>;
  setPastePendingPaths: Setter<string[]>;
  getPasteConflicts: AnyFn;
  setPasteConflicts: Setter<string[]>;
  getPasteMode: Getter<"copy" | "cut">;
  setPasteMode: Setter<"copy" | "cut">;
  setPasteApplyAll: Setter<boolean>;
  setPasteConfirmOpen: Setter<boolean>;
  setPasteConfirmIndex: Setter<number>;
  getSelectedPaths: Getter<string[]>;
  getEntries: Getter<any[]>;
  getFocusedIndex: Getter<number>;
  setLastClipboard: Setter<{ paths: string[]; cut: boolean }>;
  getLastClipboard: Getter<{ paths: string[]; cut: boolean }>;
  clipboardSetFiles: AnyFn;
  clipboardGetFiles: AnyFn;
  getCurrentPath: Getter<string>;
  isSamePathTarget: AnyFn;
  buildPastePairs: AnyFn;
  fsMove: AnyFn;
  fsCopy: AnyFn;
  loadDir: AnyFn;
  t: AnyFn;
  [key: string]: unknown;
}
