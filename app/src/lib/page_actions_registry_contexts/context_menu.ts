import { AnyFn, Getter, Setter } from "./shared";

export interface ContextMenuContext {
  getEntries: Getter<any[]>;
  getFocusedIndex: Getter<number>;
  setFocusedIndex: Setter<number>;
  getSelectedPaths: Getter<string[]>;
  setSelected: Setter<string[]>;
  setAnchorIndex: Setter<number | null>;
  setContextMenuPos: Setter<{ x: number; y: number }>;
  setContextMenuMode: Setter<"blank" | "item">;
  setContextMenuCanPaste: Setter<boolean>;
  getLastClipboard: Getter<{ paths: string[]; cut: boolean }>;
  setContextMenuOpen: Setter<boolean>;
  getContextMenuOpen: Getter<boolean>;
  getContextMenuPos: Getter<{ x: number; y: number }>;
  getContextMenuEl: Getter<HTMLElement | null>;
  tick: AnyFn;
  clipboardGetFiles: AnyFn;
  getContextMenuMode: Getter<"blank" | "item">;
  setContextMenuIndex: Setter<number>;
  getContextMenuIndex: Getter<number>;
  getContextMenuCanPaste: Getter<boolean>;
  setDeleteTargets: Setter<string[]>;
  setDeleteConfirmOpen: Setter<boolean>;
  setDeleteConfirmIndex: Setter<number>;
  setDeleteError: Setter<string>;
  loadDir: AnyFn;
  openProperties: AnyFn;
  getCurrentPath: Getter<string>;
  t: AnyFn;
  [key: string]: unknown;
}
