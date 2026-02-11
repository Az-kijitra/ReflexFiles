import { AnyFn, Getter, Setter } from "./shared";

export interface FeedbackContext {
  updateStatusMessage: AnyFn;
  getStatusMessage: Getter<string>;
  setStatusMessageState: Setter<string>;
  getStatusTimer: Getter<ReturnType<typeof setTimeout> | null>;
  setStatusTimer: Setter<ReturnType<typeof setTimeout> | null>;
  applyError: AnyFn;
  setError: Setter<string>;
  openFailures: AnyFn;
  closeFailures: AnyFn;
  setFailureModalOpen: Setter<boolean>;
  setFailureModalTitle: Setter<string>;
  setFailureItems: Setter<any[]>;
  getFailureMessage: AnyFn;
  t: AnyFn;
  [key: string]: unknown;
}
