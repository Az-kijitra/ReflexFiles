use crate::config::{config_path, load_config, save_config, save_history, save_jump_list};
use crate::error::{format_error, AppErrorKind};
use crate::types::{AppConfig, JumpItem, SortKey, SortOrder, Theme};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

fn persist_config(config: &AppConfig) -> Result<(), String> {
    save_history(&config.history_paths)
        .map_err(|e| format_error(AppErrorKind::Io, format!("save history failed: {e}")))?;
    save_jump_list(&config.history_jump_list)
        .map_err(|e| format_error(AppErrorKind::Io, format!("save jump list failed: {e}")))?;
    save_config(config)
        .map_err(|e| format_error(AppErrorKind::Io, format!("save config failed: {e}")))?;
    Ok(())
}

fn ensure_config() -> Result<(AppConfig, std::path::PathBuf), String> {
    let config = load_config();
    save_config(&config)
        .map_err(|e| format_error(AppErrorKind::Io, format!("save config failed: {e}")))?;
    Ok((config, config_path()))
}

#[tauri::command]
pub fn config_get() -> Result<AppConfig, String> {
    Ok(load_config())
}

#[tauri::command]
pub fn config_get_path() -> Result<String, String> {
    let (_, path) = ensure_config()?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn config_open_in_editor(app: tauri::AppHandle) -> Result<(), String> {
    let (_, path) = ensure_config()?;
    app.opener()
        .open_path(path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format_error(AppErrorKind::Io, e.to_string()))?;
    Ok(())
}

#[tauri::command]
pub fn config_set_dir_stats_timeout(timeout_ms: u64) -> Result<AppConfig, String> {
    let (mut config, _) = ensure_config()?;
    config.perf_dir_stats_timeout_ms = timeout_ms.max(500);
    save_config(&config)?;
    Ok(config)
}

#[tauri::command]
pub fn config_save_ui_state(
    show_hidden: bool,
    show_size: bool,
    show_time: bool,
    show_tree: bool,
    sort_key: String,
    sort_order: String,
    path_history: Vec<String>,
    jump_list: Vec<JumpItem>,
    last_path: String,
    search_history: Vec<String>,
    theme: String,
    window_x: i32,
    window_y: i32,
    window_width: u32,
    window_height: u32,
    window_maximized: bool,
) -> Result<AppConfig, String> {
    let mut config = load_config();
    config.ui_show_hidden = show_hidden;
    config.ui_show_size = show_size;
    config.ui_show_time = show_time;
    config.ui_show_tree = show_tree;
    config.view_sort_key = SortKey::parse(&sort_key);
    config.view_sort_order = SortOrder::parse(&sort_order);
    config.history_paths = path_history;
    config.history_jump_list = jump_list;
    config.session_last_path = last_path;
    config.history_search = search_history;
    config.ui_theme = Theme::parse(&theme);
    config.ui_window_x = window_x;
    config.ui_window_y = window_y;
    config.ui_window_width = window_width;
    config.ui_window_height = window_height;
    config.ui_window_maximized = window_maximized;
    persist_config(&config)?;
    Ok(config)
}

#[tauri::command]
pub fn set_window_theme(app: tauri::AppHandle, theme: String) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| format_error(AppErrorKind::NotFound, "window not found"))?;
    let theme = match theme.as_str() {
        "dark" => tauri::Theme::Dark,
        "light" => tauri::Theme::Light,
        _ => tauri::Theme::Light,
    };
    window
        .set_theme(Some(theme))
        .map_err(|e: tauri::Error| format_error(AppErrorKind::Io, e.to_string()))
}
