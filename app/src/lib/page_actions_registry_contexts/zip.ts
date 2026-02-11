import { AnyFn, Getter, Setter } from "./shared";

export interface ZipContext {
  getSelectedPaths: Getter<string[]>;
  setZipMode: Setter<"create" | "extract">;
  getZipMode: Getter<"create" | "extract">;
  setZipTargets: Setter<string[]>;
  getZipTargets: Getter<string[]>;
  setZipDestination: Setter<string>;
  getZipDestination: Getter<string>;
  setZipPassword: Setter<string>;
  getZipPassword: Getter<string>;
  setZipError: Setter<string>;
  setZipPasswordAttempts: Setter<number>;
  getZipPasswordAttempts: Getter<number>;
  setZipConfirmIndex: Setter<number>;
  setZipOverwriteConfirmed: Setter<boolean>;
  getZipOverwriteConfirmed: Getter<boolean>;
  setZipModalOpen: Setter<boolean>;
  getCurrentPath: Getter<string>;
  t: AnyFn;
  zipPasswordMaxAttempts: number;
  zipCreate: AnyFn;
  zipExtract: AnyFn;
  loadDir: AnyFn;
  [key: string]: unknown;
}
