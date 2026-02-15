use crate::config::{config_path, load_config, save_config, save_history, save_jump_list};
use crate::error::{format_error, AppErrorKind};
use crate::types::{AppConfig, FileIconMode, JumpItem, Language, SortKey, SortOrder, Theme};
use chrono::Local;
use serde::Serialize;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

#[derive(Serialize)]
pub struct DiagnosticReportResult {
    pub report_path: String,
    pub text_report_path: String,
    pub zip_path: Option<String>,
    pub copied_to_clipboard: bool,
    pub masked: bool,
    pub zipped: bool,
}

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

fn config_base_dir(cfg_path: &Path) -> PathBuf {
    cfg_path
        .parent()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn config_backups_dir(cfg_path: &Path) -> PathBuf {
    config_base_dir(cfg_path).join("backups")
}

fn copy_text_to_clipboard(value: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut child = Command::new("cmd")
            .args(["/C", "clip"])
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| format!("failed to launch clip: {e}"))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(value.as_bytes())
                .map_err(|e| format!("failed to write clip input: {e}"))?;
        }

        let status = child
            .wait()
            .map_err(|e| format!("failed to wait clip process: {e}"))?;
        if status.success() {
            Ok(())
        } else {
            Err(format!("clip exited with status {status}"))
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = value;
        Err("clipboard copy is only supported on windows".to_string())
    }
}

fn mask_pairs(cfg_path: &Path, log_path: &str) -> Vec<(String, String)> {
    let mut pairs = Vec::new();
    if let Ok(v) = std::env::var("USERPROFILE") {
        if !v.trim().is_empty() {
            pairs.push((v, "%USERPROFILE%".to_string()));
        }
    }
    if let Ok(v) = std::env::var("APPDATA") {
        if !v.trim().is_empty() {
            pairs.push((v, "%APPDATA%".to_string()));
        }
    }
    if let Ok(v) = std::env::var("LOCALAPPDATA") {
        if !v.trim().is_empty() {
            pairs.push((v, "%LOCALAPPDATA%".to_string()));
        }
    }
    if let Ok(v) = std::env::var("TEMP") {
        if !v.trim().is_empty() {
            pairs.push((v, "%TEMP%".to_string()));
        }
    }

    let cfg_parent = config_base_dir(cfg_path);
    pairs.push((cfg_parent.to_string_lossy().to_string(), "%RF_CONFIG_DIR%".to_string()));

    let normalized_log = normalize_executable_path(log_path);
    if !normalized_log.is_empty() {
        pairs.push((normalized_log, "%RF_LOG_PATH%".to_string()));
    }

    pairs
}

fn apply_masks(mut text: String, pairs: &[(String, String)]) -> String {
    for (src, token) in pairs {
        if src.trim().is_empty() {
            continue;
        }
        text = text.replace(src, token);
        let alt = src.replace('\\', "/");
        if alt != *src {
            text = text.replace(&alt, token);
        }
    }
    text
}

fn write_diagnostic_zip(zip_path: &Path, inner_name: &str, text: &str) -> Result<(), String> {
    let file = std::fs::File::create(zip_path)
        .map_err(|e| format_error(AppErrorKind::Io, format!("create zip failed: {e}")))?;
    let mut writer = ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    writer
        .start_file(inner_name.replace('\\', "/"), options)
        .map_err(|e| format_error(AppErrorKind::Io, format!("zip start_file failed: {e}")))?;
    writer
        .write_all(text.as_bytes())
        .map_err(|e| format_error(AppErrorKind::Io, format!("zip write failed: {e}")))?;
    writer
        .finish()
        .map_err(|e| format_error(AppErrorKind::Io, format!("zip finish failed: {e}")))?;
    Ok(())
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
pub fn config_create_backup() -> Result<String, String> {
    let (_, cfg_path) = ensure_config()?;
    let backups_dir = config_backups_dir(&cfg_path);
    std::fs::create_dir_all(&backups_dir).map_err(|e| {
        format_error(
            AppErrorKind::Io,
            format!("create backup directory failed: {e}"),
        )
    })?;

    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let backup_path = backups_dir.join(format!("config-{timestamp}.toml"));
    std::fs::copy(&cfg_path, &backup_path)
        .map_err(|e| format_error(AppErrorKind::Io, format!("backup failed: {e}")))?;

    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn config_restore_latest_backup() -> Result<AppConfig, String> {
    let (_, cfg_path) = ensure_config()?;
    let backups_dir = config_backups_dir(&cfg_path);
    if !backups_dir.exists() {
        return Err(format_error(AppErrorKind::NotFound, "backup directory not found"));
    }

    let mut entries: Vec<(PathBuf, std::time::SystemTime)> = Vec::new();
    let rd = std::fs::read_dir(&backups_dir)
        .map_err(|e| format_error(AppErrorKind::Io, format!("read backups failed: {e}")))?;
    for entry in rd.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Some(name) = path.file_name().and_then(|v| v.to_str()) else {
            continue;
        };
        if !name.starts_with("config-") || !name.ends_with(".toml") {
            continue;
        }
        let modified = entry
            .metadata()
            .and_then(|m| m.modified())
            .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        entries.push((path, modified));
    }

    if entries.is_empty() {
        return Err(format_error(AppErrorKind::NotFound, "no backup files found"));
    }

    entries.sort_by(|a, b| b.1.cmp(&a.1));
    let latest = &entries[0].0;
    std::fs::copy(latest, &cfg_path)
        .map_err(|e| format_error(AppErrorKind::Io, format!("restore failed: {e}")))?;

    let restored = load_config();
    save_config(&restored)
        .map_err(|e| format_error(AppErrorKind::Io, format!("save restored config failed: {e}")))?;
    Ok(restored)
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
    mask_sensitive_paths: Option<bool>,
    as_zip: Option<bool>,
    copy_path_to_clipboard: Option<bool>,
) -> Result<DiagnosticReportResult, String> {
    let (config, cfg_path) = ensure_config()?;
    let now = Local::now();
    let write_zip = as_zip.unwrap_or(false);
    let mask_paths = mask_sensitive_paths.unwrap_or(true);
    let copy_path = copy_path_to_clipboard.unwrap_or(false);
    let open_after = open_after_write.unwrap_or(true);

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

    if mask_paths {
        report = apply_masks(report, &mask_pairs(&cfg_path, &config.log_path));
    }

    let base_dir = config_base_dir(&cfg_path);
    let diagnostics_dir = base_dir.join("diagnostics");
    std::fs::create_dir_all(&diagnostics_dir).map_err(|e| {
        format_error(
            AppErrorKind::Io,
            format!("create diagnostics directory failed: {e}"),
        )
    })?;

    let stamp = now.format("%Y%m%d-%H%M%S").to_string();
    let text_name = format!("diagnostic-{stamp}.txt");
    let text_path = diagnostics_dir.join(&text_name);
    std::fs::write(&text_path, &report).map_err(|e| {
        format_error(
            AppErrorKind::Io,
            format!("write diagnostics report failed: {e}"),
        )
    })?;

    let mut zip_path: Option<PathBuf> = None;
    let report_path = if write_zip {
        let zip_name = format!("diagnostic-{stamp}.zip");
        let zip_target = diagnostics_dir.join(zip_name);
        write_diagnostic_zip(&zip_target, &text_name, &report)?;
        zip_path = Some(zip_target.clone());
        zip_target
    } else {
        text_path.clone()
    };

    if open_after {
        let _ = app
            .opener()
            .open_path(report_path.to_string_lossy().to_string(), None::<&str>);
    }

    let copied_to_clipboard = if copy_path {
        copy_text_to_clipboard(&report_path.to_string_lossy()).is_ok()
    } else {
        false
    };

    Ok(DiagnosticReportResult {
        report_path: report_path.to_string_lossy().to_string(),
        text_report_path: text_path.to_string_lossy().to_string(),
        zip_path: zip_path.map(|p| p.to_string_lossy().to_string()),
        copied_to_clipboard,
        masked: mask_paths,
        zipped: write_zip,
    })
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
