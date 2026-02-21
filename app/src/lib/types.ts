export type EntryType = "file" | "dir";
export type StorageProvider = "local" | "gdrive";
export type GdriveAuthPhase = "signed_out" | "pending" | "authorized";
export type GdriveBackendMode = "stub" | "real";

export interface ResourceRef {
  provider: StorageProvider;
  resource_id: string;
}

export interface ProviderCapabilities {
  can_read: boolean;
  can_create: boolean;
  can_rename: boolean;
  can_copy: boolean;
  can_move: boolean;
  can_delete: boolean;
  can_archive_create: boolean;
  can_archive_extract: boolean;
}

export interface GdriveAuthStatus {
  phase: GdriveAuthPhase;
  backendMode: GdriveBackendMode;
  accountId: string | null;
  grantedScopes: string[];
  refreshTokenPersisted: boolean;
  pendingStartedAtMs: number | null;
  lastError: string;
  tokenStoreBackend: string;
  tokenStoreAvailable: boolean;
}

export interface GdriveAuthStartPayload {
  authorizationUrl: string;
  issuedAtMs: number;
  pendingExpiresInSec: number;
}

export interface GdriveAuthCallbackValidated {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
  scopes: string[];
}

export interface GdriveAuthCallbackCaptured {
  callbackUrl: string;
  state: string;
  code: string;
}

export interface GdriveRevisionSnapshot {
  resourceId: string;
  fileId: string;
  modified: string;
  size: number;
  md5Checksum: string | null;
  version: string | null;
  localSha256: string;
}

export interface GdriveEditWorkcopy {
  localPath: string;
  fileName: string;
  revision: GdriveRevisionSnapshot;
}

export interface GdriveApplyEditResult {
  uploaded: boolean;
  unchanged: boolean;
  conflict: boolean;
  revision: GdriveRevisionSnapshot;
}

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
  display_path?: string;
  provider?: StorageProvider;
  ref?: ResourceRef;
  capabilities?: ProviderCapabilities;
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
  display_path?: string;
  provider?: StorageProvider;
  ref?: ResourceRef;
  capabilities?: ProviderCapabilities;
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
