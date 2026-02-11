export type OpKind = "copy" | "move";
export type OpStatus = "start" | "fail" | "done";

export interface OpFailure {
  path: string;
  code: string;
  error: string;
}

export interface OpSummary {
  ok: number;
  failed: number;
  total: number;
  failures: OpFailure[];
}

export interface OpProgress {
  op: OpKind;
  path: string;
  index: number;
  total: number;
  status: OpStatus;
  error: string;
}

export interface TrashItem {
  original: string;
  trashed: string;
}

export interface DeleteSummary {
  ok: number;
  failed: number;
  total: number;
  failures: OpFailure[];
  trashed: TrashItem[];
}

export interface DirStats {
  size: number;
  files: number;
  dirs: number;
  timed_out: boolean;
}
