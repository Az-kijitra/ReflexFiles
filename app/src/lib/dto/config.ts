export type Theme = "light" | "dark";
export type Language = "en" | "ja";
export type KeymapProfile = "windows" | "vim";
export type SortKey = "name" | "size" | "type" | "modified";
export type SortOrder = "asc" | "desc";

export type JumpItemType = "path" | "url";

export interface JumpItem {
  type: JumpItemType;
  value: string;
}

export interface ExternalAppConfig {
  name: string;
  command: string;
  args: string[];
  shortcut: string;
}

export interface AppConfig {
  config_version: number;
  perf_dir_stats_timeout_ms: number;
  ui_show_hidden: boolean;
  ui_show_size: boolean;
  ui_show_time: boolean;
  ui_show_tree: boolean;
  view_sort_key: SortKey;
  view_sort_order: SortOrder;
  history_paths: string[];
  history_jump_list: JumpItem[];
  session_last_path: string;
  history_search: string[];
  ui_theme: Theme;
  ui_language: Language;
  ui_window_x: number;
  ui_window_y: number;
  ui_window_width: number;
  ui_window_height: number;
  ui_window_maximized: boolean;
  input_keymap_profile: KeymapProfile;
  input_keymap_custom: Record<string, string>;
  external_associations: Record<string, string>;
  external_apps: ExternalAppConfig[];
  external_git_client_path: string;
  external_vscode_path: string;
  external_terminal_profile: string;
  external_terminal_profile_cmd: string;
  external_terminal_profile_powershell: string;
  external_terminal_profile_wsl: string;
  log_path: string;
  log_enabled: boolean;
}

