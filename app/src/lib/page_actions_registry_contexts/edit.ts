import { AnyFn, Getter, Setter } from "./shared";

export interface EditContext {
  setRenameTarget: Setter<string>;
  setRenameValue: Setter<string>;
  setRenameError: Setter<string>;
  setRenameOpen: Setter<boolean>;
  getRenameTarget: Getter<string>;
  getRenameValue: Getter<string>;
  getRenameInputEl: Getter<HTMLInputElement | null>;
  getRenameModalEl: Getter<HTMLElement | null>;
  fsRename: AnyFn;
  loadDir: AnyFn;
  getCurrentPath: Getter<string>;
  tick: AnyFn;
  t: AnyFn;
  setCreateType: Setter<"file" | "folder">;
  getCreateType: Getter<"file" | "folder">;
  setCreateName: Setter<string>;
  setCreateError: Setter<string>;
  setCreateOpen: Setter<boolean>;
  getCreateName: Getter<string>;
  getCreateInputEl: Getter<HTMLInputElement | null>;
  getCreateModalEl: Getter<HTMLElement | null>;
  fsCreate: AnyFn;
  [key: string]: unknown;
}
