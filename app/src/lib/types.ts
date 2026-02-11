export type EntryType = "file" | "dir";

export type {
  AppConfig,
  ExternalAppConfig,
  JumpItem,
  JumpItemType,
  KeymapProfile,
  Language,
  SortKey,
  SortOrder,
  Theme,
} from "./dto/config";

export type { OpFailure, OpSummary, OpKind, OpStatus, OpProgress } from "./dto/ops";
export type { DeleteSummary, TrashItem, DirStats } from "./dto/ops";

export interface Entry {
  name: string;
  path: string;
  type: EntryType;
  size: number;
  modified: string;
  hidden: boolean;
  ext: string;
}

export interface AppError {
  code: string;
  message: string;
}

export type PropertyKind = "file" | "dir";

export interface Properties {
  name: string;
  path: string;
  type: PropertyKind;
  size: number;
  created: string;
  modified: string;
  accessed: string;
  hidden: boolean;
  readonly: boolean;
  system: boolean;
  ext: string;
  files: number;
  dirs: number;
  dir_stats_pending: boolean;
  dir_stats_timeout: boolean;
  dir_stats_canceled?: boolean;
}

export interface TreeNode {
  path: string;
  name: string;
  depth: number;
  hidden: boolean;
  expanded: boolean;
  loaded: boolean;
  loading: boolean;
  children: TreeNode[];
}
