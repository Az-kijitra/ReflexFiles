use std::collections::HashMap;
use std::path::PathBuf;

use crate::config_io::{config_path, load_history, load_jump_list};
use crate::config_types::{AppConfig, KeymapProfile, Language, SortKey, SortOrder, Theme};

pub fn default_app_config() -> AppConfig {
    AppConfig {
        config_version: 1,
        perf_dir_stats_timeout_ms: 3000,
        ui_show_hidden: false,
        ui_show_size: true,
        ui_show_time: false,
        ui_show_tree: true,
        view_sort_key: SortKey::Name,
        view_sort_order: SortOrder::Asc,
        history_paths: vec![],
        history_jump_list: vec![],
        session_last_path: String::new(),
        history_search: vec![],
        ui_theme: Theme::Light,
        ui_language: Language::En,
        ui_window_x: 0,
        ui_window_y: 0,
        ui_window_width: 0,
        ui_window_height: 0,
        ui_window_maximized: false,
        viewer_window_x: 0,
        viewer_window_y: 0,
        viewer_window_width: 0,
        viewer_window_height: 0,
        viewer_window_maximized: false,
        input_keymap_profile: KeymapProfile::Windows,
        input_keymap_custom: HashMap::new(),
        external_associations: HashMap::new(),
        external_apps: Vec::new(),
        external_git_client_path: String::new(),
        external_vscode_path: String::new(),
        log_path: default_log_path().to_string_lossy().to_string(),
        log_enabled: true,
    }
}

pub fn normalize_config(mut config: AppConfig) -> AppConfig {
    if config.config_version == 0 {
        config.config_version = 1;
    }
    if config.perf_dir_stats_timeout_ms < 500 {
        config.perf_dir_stats_timeout_ms = 500;
    }
    let legacy = legacy_default_log_path().to_string_lossy().to_string();
    if config.log_path.trim().is_empty()
        || normalized_path_text(&config.log_path) == normalized_path_text(&legacy)
    {
        config.log_path = default_log_path().to_string_lossy().to_string();
    }
    if matches!(config.view_sort_key, SortKey::Unknown) {
        config.view_sort_key = SortKey::default();
    }
    if matches!(config.view_sort_order, SortOrder::Unknown) {
        config.view_sort_order = SortOrder::default();
    }
    if matches!(config.ui_theme, Theme::Unknown) {
        config.ui_theme = Theme::default();
    }
    if matches!(config.ui_language, Language::Unknown) {
        config.ui_language = Language::default();
    }
    if matches!(config.input_keymap_profile, KeymapProfile::Unknown) {
        config.input_keymap_profile = KeymapProfile::default();
    }
    if config.external_apps.is_empty() {
        config.external_apps = Vec::new();
    }
    let history = load_history();
    if !history.is_empty() {
        config.history_paths = history;
    }
    let jump_list = load_jump_list();
    if !jump_list.is_empty() {
        config.history_jump_list = jump_list;
    }
    config
}

pub fn default_log_path() -> PathBuf {
    local_app_data_base()
        .join("ReflexViewer")
        .join("logs")
        .join("app.log")
}

fn legacy_default_log_path() -> PathBuf {
    let base = config_path()
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    base.join("app.log")
}

fn local_app_data_base() -> PathBuf {
    std::env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .or_else(|_| std::env::var("APPDATA").map(PathBuf::from))
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn normalized_path_text(value: &str) -> String {
    value.replace('/', "\\").to_ascii_lowercase()
}

