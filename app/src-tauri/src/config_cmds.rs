use crate::config::{config_path, load_config, save_config, save_history, save_jump_list};
use crate::error::{format_error, AppErrorKind};
use crate::types::{AppConfig, FileIconMode, JumpItem, Language, SortKey, SortOrder, Theme};
use chrono::Local;
use std::path::{Path, PathBuf};
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

fn normalize_single_line(value: &str, max_len: usize) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.trim().chars() {
        if !ch.is_control() {
            out.push(ch);
        }
    }
    if out.len() > max_len {
        out.truncate(max_len);
    }
    out
}

fn strip_wrapping_quotes(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() >= 2 {
        let bytes = trimmed.as_bytes();
        let first = bytes[0];
        let last = bytes[bytes.len() - 1];
        if (first == b'"' && last == b'"') || (first == b'\'' && last == b'\'') {
            return trimmed[1..trimmed.len() - 1].trim().to_string();
        }
    }
    trimmed.to_string()
}

fn normalize_executable_path(value: &str) -> String {
    let compact = normalize_single_line(value, 1024);
    let unquoted = strip_wrapping_quotes(&compact);
    normalize_single_line(&unquoted, 1024)
}

fn bool_mark(value: bool) -> &'static str {
    if value {
        "yes"
    } else {
        "no"
    }
}

fn append_path_status(out: &mut String, label: &str, raw_path: &str) {
    let normalized = normalize_executable_path(raw_path);
    if normalized.is_empty() {
        out.push_str(&format!("{label}: (empty)\n"));
        return;
    }
    let exists = Path::new(&normalized).exists();
    out.push_str(&format!("{label}: {normalized}\n"));
    out.push_str(&format!("{label}_exists: {}\n", bool_mark(exists)));
}

fn read_tail_lines(path: &Path, max_lines: usize) -> String {
    let Ok(text) = std::fs::read_to_string(path) else {
        return String::from("(unavailable)");
    };
    let mut lines: Vec<&str> = text.lines().collect();
    if lines.len() > max_lines {
        lines = lines.split_off(lines.len() - max_lines);
    }
    lines.join("\n")
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
pub fn config_save_preferences(
    ui_theme: Option<String>,
    ui_language: Option<String>,
    ui_file_icon_mode: Option<String>,
    perf_dir_stats_timeout_ms: Option<u64>,
    external_vscode_path: Option<String>,
    external_git_client_path: Option<String>,
    external_terminal_profile: Option<String>,
    external_terminal_profile_cmd: Option<String>,
    external_terminal_profile_powershell: Option<String>,
    external_terminal_profile_wsl: Option<String>,
) -> Result<AppConfig, String> {
    let (mut config, _) = ensure_config()?;

    if let Some(value) = ui_theme {
        config.ui_theme = Theme::parse(value.trim());
    }
    if let Some(value) = ui_language {
        config.ui_language = Language::parse(value.trim());
    }
    if let Some(value) = ui_file_icon_mode {
        config.ui_file_icon_mode = FileIconMode::parse(value.trim());
    }
    if let Some(timeout) = perf_dir_stats_timeout_ms {
        config.perf_dir_stats_timeout_ms = timeout.max(500);
    }
    if let Some(value) = external_vscode_path {
        config.external_vscode_path = normalize_executable_path(&value);
    }
    if let Some(value) = external_git_client_path {
        config.external_git_client_path = normalize_executable_path(&value);
    }
    if let Some(value) = external_terminal_profile {
        config.external_terminal_profile = normalize_single_line(&value, 256);
    }
    if let Some(value) = external_terminal_profile_cmd {
        config.external_terminal_profile_cmd = normalize_single_line(&value, 256);
    }
    if let Some(value) = external_terminal_profile_powershell {
        config.external_terminal_profile_powershell = normalize_single_line(&value, 256);
    }
    if let Some(value) = external_terminal_profile_wsl {
        config.external_terminal_profile_wsl = normalize_single_line(&value, 256);
    }

    persist_config(&config)?;
    Ok(config)
}

#[tauri::command]
pub fn config_generate_diagnostic_report(
    app: tauri::AppHandle,
    open_after_write: Option<bool>,
) -> Result<String, String> {
    let (config, cfg_path) = ensure_config()?;
    let now = Local::now();
    let mut report = String::new();

    report.push_str("# ReflexFiles Diagnostic Report\n");
    report.push_str(&format!("generated_at: {}\n", now.to_rfc3339()));
    report.push_str(&format!("app_version: {}\n", app.package_info().version));
    report.push_str(&format!("os: {}\n", std::env::consts::OS));
    report.push_str(&format!("arch: {}\n", std::env::consts::ARCH));
    report.push_str(&format!(
        "exe_path: {}\n",
        std::env::current_exe()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| String::from("(unavailable)"))
    ));
    report.push('\n');

    report.push_str("[config]\n");
    report.push_str(&format!("config_path: {}\n", cfg_path.to_string_lossy()));
    report.push_str(&format!("config_exists: {}\n", bool_mark(cfg_path.exists())));
    report.push_str(&format!("ui_theme: {}\n", config.ui_theme.as_str()));
    report.push_str(&format!("ui_language: {}\n", config.ui_language.as_str()));
    report.push_str(&format!(
        "ui_file_icon_mode: {}\n",
        config.ui_file_icon_mode.as_str()
    ));
    report.push_str(&format!(
        "perf_dir_stats_timeout_ms: {}\n",
        config.perf_dir_stats_timeout_ms
    ));
    report.push_str(&format!("log_enabled: {}\n", bool_mark(config.log_enabled)));
    report.push_str(&format!("log_path: {}\n", config.log_path));
    report.push_str(&format!(
        "log_path_exists: {}\n",
        bool_mark(Path::new(&config.log_path).exists())
    ));
    append_path_status(
        &mut report,
        "external_vscode_path",
        &config.external_vscode_path,
    );
    append_path_status(
        &mut report,
        "external_git_client_path",
        &config.external_git_client_path,
    );
    report.push_str(&format!(
        "external_terminal_profile: {}\n",
        config.external_terminal_profile
    ));
    report.push_str(&format!(
        "external_terminal_profile_cmd: {}\n",
        config.external_terminal_profile_cmd
    ));
    report.push_str(&format!(
        "external_terminal_profile_powershell: {}\n",
        config.external_terminal_profile_powershell
    ));
    report.push_str(&format!(
        "external_terminal_profile_wsl: {}\n",
        config.external_terminal_profile_wsl
    ));

    report.push('\n');
    report.push_str("[terminal_profiles]\n");
    match crate::external_apps::external_list_terminal_profiles_impl() {
        Ok(profiles) => {
            report.push_str(&format!("count: {}\n", profiles.len()));
            for profile in profiles.iter().take(24) {
                report.push_str(&format!(
                    "- {} | guid={} | default={}\n",
                    profile.name,
                    if profile.guid.is_empty() {
                        "(none)"
                    } else {
                        &profile.guid
                    },
                    bool_mark(profile.is_default)
                ));
            }
        }
        Err(err) => {
            report.push_str(&format!("error: {err}\n"));
        }
    }

    report.push('\n');
    report.push_str("[log_tail]\n");
    let log_path = PathBuf::from(&config.log_path);
    if log_path.exists() {
        report.push_str(&read_tail_lines(&log_path, 120));
    } else {
        report.push_str("(log file not found)");
    }
    report.push('\n');

    let base_dir = cfg_path
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    let diagnostics_dir = base_dir.join("diagnostics");
    std::fs::create_dir_all(&diagnostics_dir).map_err(|e| {
        format_error(
            AppErrorKind::Io,
            format!("create diagnostics directory failed: {e}"),
        )
    })?;
    let report_path = diagnostics_dir.join(format!("diagnostic-{}.txt", now.format("%Y%m%d-%H%M%S")));
    std::fs::write(&report_path, report).map_err(|e| {
        format_error(
            AppErrorKind::Io,
            format!("write diagnostics report failed: {e}"),
        )
    })?;

    if open_after_write.unwrap_or(false) {
        let _ = app
            .opener()
            .open_path(report_path.to_string_lossy().to_string(), None::<&str>);
    }

    Ok(report_path.to_string_lossy().to_string())
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