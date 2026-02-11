import { AnyFn, Getter, Setter } from "./shared";

export interface UndoContext {
  getUndoStack: Getter<any[]>;
  setUndoStack: Setter<any[]>;
  getRedoStack: Getter<any[]>;
  setRedoStack: Setter<any[]>;
  undoLimit: number;
  fsDeleteTrash: AnyFn;
  fsMove: AnyFn;
  fsRename: AnyFn;
  fsCreate: AnyFn;
  fsCopyPairs: AnyFn;
  basename: AnyFn;
  loadDir: AnyFn;
  getCurrentPath: Getter<string>;
  t: AnyFn;
  [key: string]: unknown;
}
