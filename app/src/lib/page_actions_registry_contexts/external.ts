import { AnyFn, Getter, Setter } from "./shared";

export interface ExternalContext {
  normalizeExternalApps: AnyFn;
  getExternalAppsRaw: Getter<any[]>;
  getSelectedPaths: Getter<string[]>;
  getEntries: Getter<any[]>;
  getFocusedIndex: Getter<number>;
  t: AnyFn;
  getCurrentPath: Getter<string>;
  invoke: AnyFn;
  openPath: AnyFn;
  openUrl: AnyFn;
  resourceDir: AnyFn;
  joinPath: AnyFn;
  resolveResource: AnyFn;
  getExternalAppAssociations: AnyFn;
  loadDir: AnyFn;
  setAboutOpen: Setter<boolean>;
  [key: string]: unknown;
}
