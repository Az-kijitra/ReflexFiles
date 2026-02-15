use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::files::{SortKey, SortOrder};

fn default_true() -> bool {
    true
}

#[derive(Serialize, Deserialize, Default)]
#[serde(default)]
pub struct AppConfig {
    #[serde(rename = "config_version", alias = "version")]
    pub config_version: u32,
    #[serde(rename = "perf_dir_stats_timeout_ms", alias = "dir_stats_timeout_ms")]
    pub perf_dir_stats_timeout_ms: u64,
    #[serde(rename = "ui_show_hidden", alias = "show_hidden")]
    pub ui_show_hidden: bool,
    #[serde(rename = "ui_show_size", alias = "show_size")]
    pub ui_show_size: bool,
    #[serde(rename = "ui_show_time", alias = "show_time")]
    pub ui_show_time: bool,
    #[serde(rename = "ui_show_tree", alias = "show_tree", default = "default_true")]
    pub ui_show_tree: bool,
    #[serde(rename = "view_sort_key", alias = "sort_key")]
    pub view_sort_key: SortKey,
    #[serde(rename = "view_sort_order", alias = "sort_order")]
    pub view_sort_order: SortOrder,
    #[serde(rename = "history_paths", alias = "path_history")]
    pub history_paths: Vec<String>,
    #[serde(rename = "history_jump_list", alias = "jump_list")]
    pub history_jump_list: Vec<JumpItem>,
    #[serde(rename = "session_last_path", alias = "last_path")]
    pub session_last_path: String,
    #[serde(rename = "history_search", alias = "search_history")]
    pub history_search: Vec<String>,
    #[serde(rename = "ui_theme", alias = "theme")]
    pub ui_theme: Theme,
    #[serde(rename = "ui_language", alias = "language")]
    pub ui_language: Language,
    #[serde(rename = "ui_window_x")]
    pub ui_window_x: i32,
    #[serde(rename = "ui_window_y")]
    pub ui_window_y: i32,
    #[serde(rename = "ui_window_width")]
    pub ui_window_width: u32,
    #[serde(rename = "ui_window_height")]
    pub ui_window_height: u32,
    #[serde(rename = "ui_window_maximized")]
    pub ui_window_maximized: bool,
    #[serde(rename = "viewer_window_x")]
    pub viewer_window_x: i32,
    #[serde(rename = "viewer_window_y")]
    pub viewer_window_y: i32,
    #[serde(rename = "viewer_window_width")]
    pub viewer_window_width: u32,
    #[serde(rename = "viewer_window_height")]
    pub viewer_window_height: u32,
    #[serde(rename = "viewer_window_maximized")]
    pub viewer_window_maximized: bool,
    #[serde(rename = "input_keymap_profile", alias = "keymap_profile")]
    pub input_keymap_profile: KeymapProfile,
    #[serde(rename = "input_keymap_custom", alias = "keymap_custom")]
    pub input_keymap_custom: HashMap<String, String>,
    #[serde(rename = "external_associations", alias = "external_app_associations")]
    pub external_associations: HashMap<String, String>,
    pub external_apps: Vec<ExternalAppConfig>,
    #[serde(rename = "external_git_client_path", alias = "git_client")]
    pub external_git_client_path: String,
    #[serde(rename = "external_vscode_path", alias = "vscode_path")]
    pub external_vscode_path: String,
    #[serde(rename = "external_terminal_profile", alias = "terminal_profile")]
    pub external_terminal_profile: String,
    #[serde(rename = "external_terminal_profile_cmd", alias = "terminal_profile_cmd")]
    pub external_terminal_profile_cmd: String,
    #[serde(
        rename = "external_terminal_profile_powershell",
        alias = "terminal_profile_powershell"
    )]
    pub external_terminal_profile_powershell: String,
    #[serde(rename = "external_terminal_profile_wsl", alias = "terminal_profile_wsl")]
    pub external_terminal_profile_wsl: String,
    #[serde(rename = "log_path", alias = "log_file")]
    pub log_path: String,
    #[serde(rename = "log_enabled", alias = "logging_enabled")]
    pub log_enabled: bool,
}

#[derive(Serialize, Deserialize, Copy, Clone)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    #[serde(other)]
    Unknown,
}

impl Theme {
    pub fn parse(value: &str) -> Self {
        match value {
            "dark" => Theme::Dark,
            _ => Theme::Light,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Theme::Light => "light",
            Theme::Dark => "dark",
            Theme::Unknown => "light",
        }
    }
}

impl Default for Theme {
    fn default() -> Self {
        Theme::Light
    }
}

#[derive(Serialize, Deserialize, Copy, Clone)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    En,
    Ja,
    #[serde(other)]
    Unknown,
}

impl Language {
    #[allow(dead_code)]
    pub fn parse(value: &str) -> Self {
        match value {
            "ja" => Language::Ja,
            _ => Language::En,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Language::En => "en",
            Language::Ja => "ja",
            Language::Unknown => "en",
        }
    }
}

impl Default for Language {
    fn default() -> Self {
        Language::En
    }
}

#[derive(Serialize, Deserialize, Copy, Clone)]
#[serde(rename_all = "lowercase")]
pub enum KeymapProfile {
    Windows,
    Vim,
    #[serde(other)]
    Unknown,
}

impl KeymapProfile {
    #[allow(dead_code)]
    pub fn parse(value: &str) -> Self {
        match value {
            "vim" => KeymapProfile::Vim,
            _ => KeymapProfile::Windows,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            KeymapProfile::Windows => "windows",
            KeymapProfile::Vim => "vim",
            KeymapProfile::Unknown => "windows",
        }
    }
}

impl Default for KeymapProfile {
    fn default() -> Self {
        KeymapProfile::Windows
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum JumpItemType {
    Path,
    Url,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct JumpItem {
    #[serde(rename = "type")]
    pub item_type: JumpItemType,
    pub value: String,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct ExternalAppConfig {
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub shortcut: String,
}

#[derive(Serialize, Deserialize, Default)]
pub struct HistoryFile {
    pub history: Vec<String>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct JumpListFile {
    pub jump_list: Vec<JumpItem>,
}

