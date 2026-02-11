import { AnyFn, Getter, Setter } from "./shared";

export interface SelectionContext {
  getSelectedPaths: Getter<string[]>;
  setSelected: Setter<string[]>;
  getEntries: Getter<any[]>;
  getFocusedIndex: Getter<number>;
  setFocusedIndex: Setter<number>;
  setAnchorIndex: Setter<number | null>;
  toggleSelectionAtIndex: AnyFn;
  selectRangeByIndex: AnyFn;
  selectAllEntries: AnyFn;
  clearSelectionState: AnyFn;
  invertSelectionPaths: AnyFn;
  moveFocusByRow: AnyFn;
  [key: string]: unknown;
}
