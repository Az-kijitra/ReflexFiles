import { AnyFn, Getter, Setter } from "./shared";

export interface DeleteContext {
  getDeleteTargets: Getter<string[]>;
  setDeleteTargets: Setter<string[]>;
  setDeleteConfirmOpen: Setter<boolean>;
  setDeleteError: Setter<string>;
  fsDeleteWithUndo: AnyFn;
  loadDir: AnyFn;
  getCurrentPath: Getter<string>;
  tick: AnyFn;
  getDeleteModalEl: Getter<HTMLElement | null>;
  t: AnyFn;
  [key: string]: unknown;
}
