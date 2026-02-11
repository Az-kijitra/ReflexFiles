import { AnyFn, Getter } from "./shared";

export interface FileOpsContext {
  getSelectedPaths: Getter<string[]>;
  getEntries: Getter<any[]>;
  getFocusedIndex: Getter<number>;
  buildDuplicatePairs: AnyFn;
  fsCopyPairs: AnyFn;
  fsRename: AnyFn;
  basename: AnyFn;
  getCurrentPath: Getter<string>;
  loadDir: AnyFn;
  t: AnyFn;
  [key: string]: unknown;
}
